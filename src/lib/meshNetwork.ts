import type SimplePeerType from 'simple-peer';
import { offlineStorage, OfflineCourse } from './offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

let SimplePeerCtor: any | null = null;
async function getSimplePeer() {
  if (!SimplePeerCtor) {
    const mod = await import('simple-peer');
    SimplePeerCtor = mod.default;
  }
  return SimplePeerCtor;
}

interface Peer {
  id: string;
  name: string;
  connection: SimplePeerType.Instance;
  availableCourses: string[];
}

class MeshNetwork {
  private peers: Map<string, Peer> = new Map();
  private myId: string;
  private myName: string;
  private sharingEnabled: boolean = true;
  private currentRoomCode: string | null = null;
  private signalingChannel: RealtimeChannel | null = null;
  private onPeersUpdated: (() => void) | null = null;

  constructor() {
    this.myId = this.generateId();
    this.myName = `Student-${this.myId.slice(0, 6)}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  setSharingEnabled(enabled: boolean) {
    this.sharingEnabled = enabled;
  }

  setOnPeersUpdated(callback: () => void) {
    this.onPeersUpdated = callback;
  }

  async getAvailableCourses(): Promise<string[]> {
    const courses = await offlineStorage.getAllCourses();
    return courses.map(c => c.id);
  }

  async createRoom(userId: string, userName: string): Promise<string> {
    // Generate 6-digit room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('mesh_rooms')
      .insert({
        code,
        host_id: userId,
        host_name: userName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      throw error;
    }

    this.currentRoomCode = code;
    this.myName = userName;
    await this.setupSignalingChannel(code);
    // Immediately announce our presence for discovery
    await this.sendPresence();
    
    console.log(`Room created with code: ${code}`);
    return code;
  }

  async joinRoom(roomCode: string, userName: string): Promise<boolean> {
    // Verify room exists and is active
    const { data: room, error } = await supabase
      .from('mesh_rooms')
      .select('*')
      .eq('code', roomCode)
      .eq('is_active', true)
      .single();

    if (error || !room) {
      console.error('Room not found or inactive');
      return false;
    }

    this.currentRoomCode = roomCode;
    this.myName = userName;
    await this.setupSignalingChannel(roomCode);
    
    // Announce presence to room by sending an offer
    await this.announcePresence();
    
    console.log(`Joined room: ${roomCode}`);
    return true;
  }

  private async sendPresence() {
    if (!this.currentRoomCode) return;
    try {
      await supabase.from('mesh_signaling').insert({
        room_code: this.currentRoomCode,
        peer_id: this.myId,
        peer_name: this.myName,
        target_peer_id: null,
        signal_type: 'presence',
        signal_data: {}
      });
      console.log('Presence announced');
    } catch (err) {
      console.error('Failed to announce presence:', err);
    }
  }

  private async announcePresence() {
    if (!this.currentRoomCode) return;

    // 1) Announce our presence so others can initiate connections to us
    await this.sendPresence();

    // 2) Also look at recent signals to proactively connect to existing peers
    const { data: recentSignals } = await supabase
      .from('mesh_signaling')
      .select('peer_id, peer_name')
      .eq('room_code', this.currentRoomCode)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentSignals) {
      const uniquePeers = new Map<string, string>();
      recentSignals.forEach(signal => {
        if (signal.peer_id !== this.myId) {
          uniquePeers.set(signal.peer_id, signal.peer_name);
        }
      });

      for (const [peerId, peerName] of uniquePeers) {
        await this.initiateConnection(peerId, peerName);
      }
    }
  }

  private async setupSignalingChannel(roomCode: string) {
    // Clean up existing channel
    if (this.signalingChannel) {
      await supabase.removeChannel(this.signalingChannel);
    }

    // Subscribe to signaling messages for this room
    this.signalingChannel = supabase
      .channel(`mesh_room_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mesh_signaling',
          filter: `room_code=eq.${roomCode}`
        },
        async (payload: any) => {
          await this.handleSignalingMessage(payload.new);
        }
      )
      .subscribe();

    console.log(`Subscribed to signaling channel for room ${roomCode}`);
  }

  private async handleSignalingMessage(message: any) {
    const { peer_id, peer_name, target_peer_id, signal_type, signal_data } = message;

    // Ignore our own signals
    if (peer_id === this.myId) return;

    // Handle presence broadcasts for peer discovery
    if (signal_type === 'presence') {
      // Proactively initiate a connection to the announcing peer
      // Avoid duplicates if already connected/connecting
      if (!this.peers.has(peer_id)) {
        await this.initiateConnection(peer_id, peer_name);
      }
      return;
    }

    // Check if this signal is for us
    if (target_peer_id && target_peer_id !== this.myId) return;

    console.log(`Received ${signal_type} from ${peer_name} (${peer_id})`);

    try {
      const SimplePeer = await getSimplePeer();
      let peer = this.peers.get(peer_id);

      if (signal_type === 'offer') {
        // Create peer connection for incoming offer
        if (!peer) {
          const peerConnection = new SimplePeer({
            initiator: false,
            trickle: true,
          }) as SimplePeerType.Instance;

          peer = {
            id: peer_id,
            name: peer_name,
            connection: peerConnection,
            availableCourses: [],
          };

          this.setupPeerListeners(peer);
          this.peers.set(peer_id, peer);
        }

        peer.connection.signal(signal_data);
      } else if (signal_type === 'answer' && peer) {
        peer.connection.signal(signal_data);
      } else if (signal_type === 'ice-candidate' && peer) {
        peer.connection.signal(signal_data);
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  }

  private setupPeerListeners(peer: Peer) {
    peer.connection.on('signal', async (data: any) => {
      // Send signal through Supabase
      if (!this.currentRoomCode) return;

      const signalType = data.type === 'offer' ? 'offer' : 
                        data.type === 'answer' ? 'answer' : 'ice-candidate';

      await supabase.from('mesh_signaling').insert({
        room_code: this.currentRoomCode,
        peer_id: this.myId,
        peer_name: this.myName,
        target_peer_id: peer.id,
        signal_type: signalType,
        signal_data: data,
      });

      console.log(`Sent ${signalType} to ${peer.id}`);
    });

    peer.connection.on('connect', async () => {
      console.log(`✅ Connected to peer ${peer.name} (${peer.id})`);
      
      // Exchange available courses
      const myCourses = await this.getAvailableCourses();
      peer.connection.send(JSON.stringify({
        type: 'courses',
        courses: myCourses,
        name: this.myName
      }));

      if (this.onPeersUpdated) this.onPeersUpdated();
    });

    peer.connection.on('data', async (data: any) => {
      const message = JSON.parse(data.toString());
      await this.handlePeerMessage(peer.id, message, peer.connection);
    });

    peer.connection.on('error', (err: Error) => {
      console.error('Peer error:', err);
      this.peers.delete(peer.id);
      if (this.onPeersUpdated) this.onPeersUpdated();
    });

    peer.connection.on('close', () => {
      console.log(`Disconnected from peer ${peer.id}`);
      this.peers.delete(peer.id);
      if (this.onPeersUpdated) this.onPeersUpdated();
    });
  }

  async initiateConnection(targetPeerId: string, targetPeerName: string): Promise<boolean> {
    if (!this.currentRoomCode) {
      console.error('Not in a room');
      return false;
    }

    // Don't connect to ourselves or if already connected
    if (targetPeerId === this.myId || this.peers.has(targetPeerId)) {
      return false;
    }

    try {
      const SimplePeer = await getSimplePeer();
      const peerConnection = new SimplePeer({
        initiator: true,
        trickle: true,
      }) as SimplePeerType.Instance;

      const peer: Peer = {
        id: targetPeerId,
        name: targetPeerName,
        connection: peerConnection,
        availableCourses: [],
      };

      this.setupPeerListeners(peer);
      this.peers.set(targetPeerId, peer);

      console.log(`Initiating connection to ${targetPeerName}`);
      return true;
    } catch (err) {
      console.error('Failed to initiate connection:', err);
      return false;
    }
  }

  private async handlePeerMessage(peerId: string, message: any, connection: SimplePeerType.Instance) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    switch (message.type) {
      case 'courses':
        peer.name = message.name;
        peer.availableCourses = message.courses;
        console.log(`Peer ${message.name} has ${message.courses.length} courses`);
        if (this.onPeersUpdated) this.onPeersUpdated();
        break;

      case 'request_course':
        if (this.sharingEnabled) {
          await this.sendCourse(peerId, message.courseId);
        }
        break;

      case 'course_data':
        await this.receiveCourse(message.course);
        break;
    }
  }

  async requestCourse(peerId: string, courseId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) {
      console.error('Peer not found');
      return false;
    }

    peer.connection.send(JSON.stringify({
      type: 'request_course',
      courseId
    }));

    return true;
  }

  private async sendCourse(peerId: string, courseId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const course = await offlineStorage.getCourse(courseId);
    if (!course) {
      console.error('Course not found locally');
      return;
    }

    peer.connection.send(JSON.stringify({
      type: 'course_data',
      course
    }));

    console.log(`Sent course ${courseId} to peer ${peerId}`);
  }

  private async receiveCourse(course: OfflineCourse) {
    await offlineStorage.saveCourse(course);
    console.log(`Received and saved course ${course.id}`);
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  async leaveRoom() {
    // Disconnect all peers
    this.peers.forEach(peer => {
      peer.connection.destroy();
    });
    this.peers.clear();

    // Unsubscribe from signaling
    if (this.signalingChannel) {
      await supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }

    // Clean up room if we're the host
    if (this.currentRoomCode) {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase
          .from('mesh_rooms')
          .update({ is_active: false })
          .eq('code', this.currentRoomCode)
          .eq('host_id', user.user.id);
      }
    }

    this.currentRoomCode = null;
    if (this.onPeersUpdated) this.onPeersUpdated();
    console.log('Left room and disconnected all peers');
  }

  getCurrentRoomCode(): string | null {
    return this.currentRoomCode;
  }

  disconnectAll() {
    this.leaveRoom();
  }
}

export const meshNetwork = new MeshNetwork();
