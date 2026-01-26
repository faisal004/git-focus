import { useEffect, useMemo, useState } from 'react';
import { useStatistics } from './useStatistics';
import { Chart } from './Chart';
import { UpdateNotification } from './UpdateNotification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/card';
import { cn } from './lib/utils';

function App() {
  const staticData = useStaticData();
  const statistics = useStatistics(10);
  const [activeView, setActiveView] = useState<View>('CPU');

  const cpuUsages = useMemo(
    () => statistics.map((stat) => stat.cpuUsage),
    [statistics]
  );
  const ramUsages = useMemo(
    () => statistics.map((stat) => stat.ramUsage),
    [statistics]
  );
  const storageUsages = useMemo(
    () => statistics.map((stat) => stat.storageUsage),
    [statistics]
  );
  const activeUsages = useMemo(() => {
    switch (activeView) {
      case 'CPU':
        return cpuUsages;
      case 'RAM':
        return ramUsages;
      case 'STORAGE':
        return storageUsages;
    }
  }, [activeView, cpuUsages, ramUsages, storageUsages]);

  return (
    <div className="w-screen h-screen bg-background p-4 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">System Monitor</h1>
        <p className="text-sm text-muted-foreground">v0.0.23</p>
      </div>

      {/* Update Notification */}
      <UpdateNotification />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[280px_1fr] gap-4 min-h-0">
        {/* Sidebar - Resource Options */}
        <div className="flex flex-col gap-3">
          <SelectOption
            onClick={() => setActiveView('CPU')}
            title="CPU"
            view="CPU"
            subTitle={staticData?.cpuModel ?? ''}
            data={cpuUsages}
            activeView={activeView}
          />
          <SelectOption
            onClick={() => setActiveView('RAM')}
            title="RAM"
            view="RAM"
            subTitle={(staticData?.totalMemoryGB.toString() ?? '') + ' GB'}
            data={ramUsages}
            activeView={activeView}
          />
          <SelectOption
            onClick={() => setActiveView('STORAGE')}
            title="STORAGE"
            view="STORAGE"
            subTitle={(staticData?.totalStorage.toString() ?? '') + ' GB'}
            data={storageUsages}
            activeView={activeView}
          />
        </div>

        {/* Main Chart */}
        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-2">
            <CardTitle>{activeView} Usage</CardTitle>
            <CardDescription>Real-time {activeView.toLowerCase()} utilization</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-4">
            <div className="w-full h-full min-h-[200px]">
              <Chart
                selectedView={activeView}
                data={activeUsages}
                maxDataPoints={10}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SelectOption(props: {
  title: string;
  view: View;
  subTitle: string;
  data: number[];
  onClick: () => void;
  activeView: View;
}) {
  const isActive = props.view === props.activeView;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-muted-foreground/50",
        isActive && "border-primary ring-1 ring-primary"
      )}
      onClick={props.onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{props.title}</CardTitle>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {props.subTitle}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[60px]">
          <Chart selectedView={props.view} data={props.data} maxDataPoints={10} />
        </div>
      </CardContent>
    </Card>
  );
}

function useStaticData() {
  const [staticData, setStaticData] = useState<StaticData | null>(null);

  useEffect(() => {
    (async () => {
      setStaticData(await window.electron.getStaticData());
    })();
  }, []);

  return staticData;
}

export default App;
