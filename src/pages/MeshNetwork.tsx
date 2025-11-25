import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Users, Wifi, Database, Share2, Link2, LogOut, Copy, Check } from "lucide-react";
import { meshNetwork } from "@/lib/meshNetwork";
import { offlineStorage } from "@/lib/offlineStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function MeshNetwork() {
  const navigate = useNavigate();
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [peers, setPeers] = useState<any[]>([]);
  const [offlineCourses, setOfflineCourses] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState({ courses: 0, total: 0 });
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadData();
    
    // Set up peer update callback
    meshNetwork.setOnPeersUpdated(() => {
      setPeers(meshNetwork.getPeers());
    });
    
    // Update peer list and room status periodically
    const interval = setInterval(() => {
      const peerList = meshNetwork.getPeers();
      setPeers(peerList);
      const room = meshNetwork.getCurrentRoomCode();
      setCurrentRoom(room);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const courses = await offlineStorage.getAllCourses();
    const storage = await offlineStorage.getStorageSize();
    setOfflineCourses(courses);
    setStorageInfo(storage);
  };

  const handleToggleSharing = (enabled: boolean) => {
    setSharingEnabled(enabled);
    meshNetwork.setSharingEnabled(enabled);
    toast.success(enabled ? "Sharing enabled" : "Sharing disabled");
  };

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsConnecting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create a room");
        return;
      }

      const code = await meshNetwork.createRoom(user.id, userName.trim());
      setCurrentRoom(code);
      toast.success(`Room created! Code: ${code}`);
    } catch (error: any) {
      console.error('Failed to create room:', error);
      toast.error(error.message || "Failed to create room. Please sign in first.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error("Please enter a valid 6-digit room code");
      return;
    }

    setIsConnecting(true);
    try {
      const success = await meshNetwork.joinRoom(roomCode.toUpperCase(), userName.trim());
      if (success) {
        setCurrentRoom(roomCode.toUpperCase());
        toast.success("Joined room successfully!");
      } else {
        toast.error("Room not found or inactive");
      }
    } catch (error: any) {
      console.error('Failed to join room:', error);
      toast.error(error.message || "Failed to join room");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeaveRoom = async () => {
    await meshNetwork.leaveRoom();
    setCurrentRoom(null);
    setPeers([]);
    toast.info("Left room");
  };

  const handleCopyCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom);
      setCopiedCode(true);
      toast.success("Room code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRequestCourse = async (peerId: string, courseId: string) => {
    const success = await meshNetwork.requestCourse(peerId, courseId);
    if (success) {
      toast.success("Course requested");
    } else {
      toast.error("Failed to request course");
    }
  };

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear all offline data?")) {
      await offlineStorage.clearAll();
      await loadData();
      toast.success("Cache cleared");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              Mesh Network
              {currentRoom && (
                <Badge variant="default" className="gap-1">
                  <Wifi className="h-3 w-3" />
                  Connected
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              First educational platform with peer-to-peer course sharing via mesh network
            </p>
          </div>

          {/* Room Management */}
          {!currentRoom ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Create or Join Room
                </CardTitle>
                <CardDescription>Connect with peers to share courses offline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="userName">Your Name</Label>
                  <Input
                    id="userName"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Create New Room</h3>
                    <p className="text-sm text-muted-foreground">
                      Start sharing courses with nearby peers
                    </p>
                    <Button
                      onClick={handleCreateRoom}
                      disabled={isConnecting}
                      className="w-full"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {isConnecting ? "Creating..." : "Create Room"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Join Existing Room</h3>
                    <Input
                      placeholder="Enter 6-digit code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="font-mono text-lg text-center"
                    />
                    <Button
                      onClick={handleJoinRoom}
                      disabled={isConnecting}
                      variant="outline"
                      className="w-full"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      {isConnecting ? "Joining..." : "Join Room"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Active Room
                </CardTitle>
                <CardDescription>Currently connected to sharing room</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Room Code</p>
                    <p className="text-3xl font-mono font-bold">{currentRoom}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {peers.length} peer{peers.length !== 1 ? 's' : ''} connected
                    </span>
                  </div>
                  <Button
                    onClick={handleLeaveRoom}
                    variant="destructive"
                    size="sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Storage Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Offline Storage
              </CardTitle>
              <CardDescription>Your downloaded content available offline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{storageInfo.courses}</p>
                  <p className="text-sm text-muted-foreground">Courses offline</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{storageInfo.total}</p>
                  <p className="text-sm text-muted-foreground">Total items</p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleClearCache} className="w-full">
                Clear All Cache
              </Button>
            </CardContent>
          </Card>

          {/* Sharing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Sharing Settings
              </CardTitle>
              <CardDescription>Allow others to download courses from you</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Course Sharing</p>
                <p className="text-sm text-muted-foreground">
                  Share your downloaded courses with nearby peers
                </p>
              </div>
              <Switch checked={sharingEnabled} onCheckedChange={handleToggleSharing} />
            </CardContent>
          </Card>

          {/* Connected Peers */}
          {currentRoom && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Connected Peers
                </CardTitle>
                <CardDescription>Real-time peer-to-peer connections in this room</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {peers.length > 0 ? (
                  <div className="space-y-2">
                    {peers.map((peer) => (
                      <Card key={peer.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              <div>
                                <p className="font-medium">{peer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {peer.availableCourses.length} courses shared
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Request Courses
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Waiting for peers to join...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Share the room code with nearby students
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Offline Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Your Offline Courses</CardTitle>
              <CardDescription>Courses available without internet</CardDescription>
            </CardHeader>
            <CardContent>
              {offlineCourses.length > 0 ? (
                <div className="space-y-2">
                  {offlineCourses.map((course) => (
                    <Card key={course.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Cached {new Date(course.cached_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/course/${course.id}`)}
                          >
                            Open
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No offline courses yet. Download courses from the courses page.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
