import { supabase } from "@/integrations/supabase/client";
import { offlineStorage } from "./offlineStorage";

let syncInterval: NodeJS.Timeout | null = null;

export const syncManager = {
  isOnline: () => navigator.onLine,

  async syncPendingTransactions() {
    if (!this.isOnline()) {
      console.log('Offline, skipping sync');
      return;
    }

    const pending = await offlineStorage.getPendingTransactions();
    console.log(`Syncing ${pending.length} pending transactions`);

    for (const transaction of pending) {
      try {
        const { data, error } = await supabase.functions.invoke('sync-offline-data', {
          body: { transaction }
        });

        if (!error) {
          await offlineStorage.removePendingTransaction(transaction.id);
          console.log(`Synced transaction ${transaction.id}`);
        } else {
          console.error('Sync error:', error);
        }
      } catch (err) {
        console.error('Failed to sync transaction:', err);
      }
    }
  },

  async downloadCourseForOffline(courseId: string) {
    try {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*, chapters(*)')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Add cached_at timestamp when saving
      await offlineStorage.saveCourse({
        ...course,
        cached_at: Date.now()
      });

      // Download chapters
      if (course.chapters) {
        for (const chapter of course.chapters) {
          await offlineStorage.saveChapter(chapter);
        }
      }

      console.log(`Downloaded course ${courseId} for offline use`);
      return true;
    } catch (err) {
      console.error('Failed to download course:', err);
      return false;
    }
  },

  startAutoSync(intervalMs: number = 5 * 60 * 1000) {
    if (syncInterval) {
      clearInterval(syncInterval);
    }

    syncInterval = setInterval(() => {
      if (this.isOnline()) {
        this.syncPendingTransactions();
      }
    }, intervalMs);

    // Also sync when coming back online
    window.addEventListener('online', () => {
      console.log('Back online, syncing...');
      this.syncPendingTransactions();
    });
  },

  stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }
};
