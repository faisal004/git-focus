import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/card';
import { Button } from './components/button';
import { cn } from './lib/utils';

export function UpdateNotification() {
    const [statusMsg, setStatusMsg] = useState('');
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [updateReady, setUpdateReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        console.log("UpdateNotification: Setting up IPC listeners");

        const unsubChecking = window.electron.onCheckingForUpdate(() => {
            console.log("UpdateNotification: Received checking-for-update");
            setStatusMsg("Checking for updates...");
            setHasError(false);
        });

        const unsubAvailable = window.electron.onUpdateAvailable(() => {
            console.log("UpdateNotification: Received update-available");
            setStatusMsg("Update available!");
            setUpdateAvailable(true);
            setHasError(false);
        });

        const unsubNotAvailable = window.electron.onUpdateNotAvailable(() => {
            console.log("UpdateNotification: Received update-not-available");
            setStatusMsg("You're on the latest version.");
            setUpdateAvailable(false);
        });

        const unsubProgress = window.electron.onDownloadProgress((progress) => {
            console.log("UpdateNotification: Received download-progress", progress);
            const msg = `Downloading: ${progress.percent.toFixed(1)}% (${(progress.transferred / 1024 / 1024).toFixed(1)}MB / ${(progress.total / 1024 / 1024).toFixed(1)}MB)`;
            setStatusMsg(msg);
            setDownloadProgress(progress.percent);
        });

        const unsubDownloaded = window.electron.onUpdateDownloaded(() => {
            console.log("UpdateNotification: Received update-downloaded");
            setStatusMsg("Update downloaded. Ready to install.");
            setDownloadProgress(null);
            setUpdateReady(true);
            setUpdateAvailable(false);
        });

        const unsubError = window.electron.onUpdateError((err) => {
            console.log("UpdateNotification: Received update-error", err);
            setStatusMsg(`Error: ${err}`);
            setHasError(true);
            setUpdateAvailable(false);
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

    const handleDownload = () => {
        window.electron.startDownload();
    };

    const handleInstall = () => {
        window.electron.installUpdate();
    };

    const handleCheckForUpdates = () => {
        console.log("Manual check for updates button clicked");
        setStatusMsg("Checking for updates...");
        setHasError(false);
        window.electron.checkForUpdates();
    };

    return (
        <Card className="max-w-xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Updates
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Status Message */}
                <p className={cn(
                    "text-sm break-words",
                    hasError ? "text-destructive" : "text-muted-foreground"
                )}>
                    {statusMsg || "Ready to check for updates..."}
                </p>

                {/* Progress Bar */}
                {downloadProgress !== null && (
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all duration-200 rounded-full"
                            style={{ width: `${downloadProgress}%` }}
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckForUpdates}
                    >
                        Check for Updates
                    </Button>

                    {updateAvailable && (
                        <Button
                            size="sm"
                            onClick={handleDownload}
                        >
                            Download
                        </Button>
                    )}

                    {updateReady && (
                        <Button
                            size="sm"
                            onClick={handleInstall}
                        >
                            Install & Restart
                        </Button>
                    )}
                </div>

                {/* Error Help Text */}
                {hasError && (
                    <p className="text-xs text-destructive/80">
                        If you installed an older version (v0.0.5 or earlier), please manually download the latest version from GitHub.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
