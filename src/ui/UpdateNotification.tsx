import { useEffect } from 'react';
import { toast } from 'sonner';

export function UpdateNotification() {
    useEffect(() => {
        const unsubChecking = window.electron.onCheckingForUpdate(() => {
            // Optional: toast.info("Checking for updates...");
        });

        const unsubAvailable = window.electron.onUpdateAvailable(() => {
            toast.info("Update available! Downloading now...", {
                duration: 5000,
            });
        });

        const unsubNotAvailable = window.electron.onUpdateNotAvailable(() => {
            // Optional: toast.success("You are up to date!");
        });

        const unsubProgress = window.electron.onDownloadProgress(() => {
            // We can show a progress toast or just wait for completion
            // For now, let's keep it quiet to avoid spamming toasts
            // Or use a persistent toast ID to update progress
        });

        const unsubDownloaded = window.electron.onUpdateDownloaded(() => {
            toast.success("Update downloaded!", {
                description: "Restart to apply changes.",
                action: {
                    label: "Restart",
                    onClick: () => window.electron.installUpdate(),
                },
                duration: Infinity, // Keep open until clicked
            });
        });

        const unsubError = window.electron.onUpdateError((err) => {
            toast.error("Update failed", {
                description: err || "Unknown error",
            });
        });

        return () => {
            unsubChecking();
            unsubAvailable();
            unsubNotAvailable();
            unsubProgress();
            unsubDownloaded();
            unsubError();
        };
    }, []);

    // This component is now headless (UI handled by Toaster)
    return null;
}
