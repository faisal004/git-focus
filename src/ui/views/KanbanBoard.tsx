import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft, Calendar } from "lucide-react";

// Types are globally available via types.d.ts

export function KanbanBoard() {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const loadedTasks = await window.electron.getKanbanTasks();
            setTasks(loadedTasks);
        } catch (error) {
            console.error("Failed to load tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const newTask = await window.electron.createKanbanTask({
                title: newTaskTitle,
                description: "",
                status: "todo",
            });
            setTasks([newTask, ...tasks]);
            setNewTaskTitle("");
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to create task:", error);
        }
    };

    const handleStatusChange = async (task: KanbanTask, newStatus: KanbanStatus) => {
        try {
            // Optimistic update
            const updatedTasks = tasks.map((t) =>
                t.id === task.id ? { ...t, status: newStatus } : t
            );
            setTasks(updatedTasks);

            await window.electron.updateKanbanTaskStatus(task.id, newStatus);
        } catch (error) {
            console.error("Failed to update status:", error);
            // Revert on error
            loadTasks();
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            // Optimistic update
            setTasks(tasks.filter((t) => t.id !== id));
            await window.electron.deleteKanbanTask(id);
        } catch (error) {
            console.error("Failed to delete task:", error);
            loadTasks();
        }
    };

    const columns: { id: KanbanStatus; title: string }[] = [
        { id: "todo", title: "To Do" },
        { id: "in-progress", title: "In Progress" },
        { id: "done", title: "Done" },
    ];

    if (loading) {
        return <div className="p-8 text-center">Loading board...</div>;
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Weekly Planner</h2>
                    <p className="text-muted-foreground">Plan your week and track your progress.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    <Plus size={16} />
                    New Task
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleCreateTask} className="bg-card border rounded-lg p-4 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="What do you want to achieve this week?"
                            className="flex-1 bg-background border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!newTaskTitle.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                {columns.map((col) => (
                    <div key={col.id} className="flex flex-col h-full bg-muted/30 rounded-lg p-4 border border-border/50">
                        <h3 className="font-semibold mb-4 flex items-center justify-between">
                            {col.title}
                            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                {tasks.filter(t => t.status === col.id).length}
                            </span>
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {tasks
                                .filter((task) => task.status === col.id)
                                .map((task) => (
                                    <div
                                        key={task.id}
                                        className="group bg-card p-3 rounded-md border shadow-sm hover:shadow-md transition-all animate-in fade-in zoom-in-95 duration-200"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="font-medium text-sm leading-tight">{task.title}</p>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete task"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar size={10} />
                                                {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>

                                            <div className="flex gap-1">
                                                {col.id !== 'todo' && (
                                                    <button
                                                        onClick={() => handleStatusChange(task, col.id === 'done' ? 'in-progress' : 'todo')}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                        title="Move back"
                                                    >
                                                        <ArrowLeft size={14} />
                                                    </button>
                                                )}
                                                {col.id !== 'done' && (
                                                    <button
                                                        onClick={() => handleStatusChange(task, col.id === 'todo' ? 'in-progress' : 'done')}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                        title="Move forward"
                                                    >
                                                        <ArrowRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            {tasks.filter(t => t.status === col.id).length === 0 && (
                                <div className="h-24 border-2 border-dashed border-muted rounded-md flex items-center justify-center text-muted-foreground text-sm italic">
                                    No tasks
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
