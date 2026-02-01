import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, CheckSquare, Square, X } from "lucide-react";

// Types are globally available via types.d.ts

export function KanbanBoard() {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Subtask state for the currently expanded task (simple accordion style or just always show)
    // For simplicity, let's always show subtasks or use a local state map if needed.
    // Actually, expanding might be better for UI cleanliness.
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

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
            // Ensure subtasks is initialized
            const taskWithSubtasks = { ...newTask, subtasks: [] };
            setTasks([taskWithSubtasks, ...tasks]);
            setNewTaskTitle("");
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to create task:", error);
        }
    };

    const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            setTasks(tasks.filter((t) => t.id !== id));
            await window.electron.deleteKanbanTask(id);
        } catch (error) {
            console.error("Failed to delete task:", error);
            loadTasks();
        }
    };

    // === Drag and Drop ===

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
        // e.dataTransfer.setData("text/plain", taskId); // Not strictly needed if we use state
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, status: KanbanStatus) => {
        e.preventDefault();
        if (!draggedTaskId) return;

        const task = tasks.find((t) => t.id === draggedTaskId);
        if (!task || task.status === status) {
            setDraggedTaskId(null);
            return;
        }

        try {
            // Optimistic update
            const updatedTasks = tasks.map((t) =>
                t.id === draggedTaskId ? { ...t, status } : t
            );
            setTasks(updatedTasks);
            setDraggedTaskId(null);

            await window.electron.updateKanbanTaskStatus(draggedTaskId, status);
        } catch (error) {
            console.error("Failed to update status:", error);
            loadTasks();
        }
    };

    // === Subtasks ===

    const handleAddSubtask = async (e: React.FormEvent, taskId: string) => {
        e.preventDefault();
        const title = newSubtaskTitles[taskId];
        if (!title?.trim()) return;

        try {
            const newSubtask = await window.electron.createKanbanSubtask({
                taskId,
                title,
            });

            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return { ...t, subtasks: [...t.subtasks, newSubtask] };
                }
                return t;
            });
            setTasks(updatedTasks);
            setNewSubtaskTitles(prev => ({ ...prev, [taskId]: "" }));
        } catch (error) {
            console.error("Failed to create subtask:", error);
        }
    };

    const handleToggleSubtask = async (subtaskId: string, completed: boolean, taskId: string) => {
        try {
            // Optimistic
            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return {
                        ...t,
                        subtasks: t.subtasks.map(st =>
                            st.id === subtaskId ? { ...st, completed } : st
                        )
                    };
                }
                return t;
            });
            setTasks(updatedTasks);

            await window.electron.toggleKanbanSubtask(subtaskId, completed);
        } catch (error) {
            console.error("Failed to toggle subtask:", error);
            loadTasks();
        }
    };

    const handleDeleteSubtask = async (subtaskId: string, taskId: string) => {
        try {
            // Optimistic
            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return {
                        ...t,
                        subtasks: t.subtasks.filter(st => st.id !== subtaskId)
                    };
                }
                return t;
            });
            setTasks(updatedTasks);

            await window.electron.deleteKanbanSubtask(subtaskId);
        } catch (error) {
            console.error("Failed to delete subtask:", error);
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
                    <p className="text-muted-foreground">Plan your week. Drag and drop to track progress.</p>
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
                    <div
                        key={col.id}
                        className={`flex flex-col h-full bg-muted/30 rounded-lg p-4 border transition-colors ${draggedTaskId ? "border-primary/30 bg-muted/50" : "border-border/50"
                            }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
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
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        className={`group bg-card p-3 rounded-md border shadow-sm hover:shadow-md transition-all animate-in fade-in zoom-in-95 duration-200 cursor-move ${draggedTaskId === task.id ? "opacity-50" : "opacity-100"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="font-medium text-sm leading-tight">{task.title}</p>
                                            <button
                                                onClick={(e) => handleDeleteTask(task.id, e)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete task"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Subtasks Section */}
                                        <div className="mt-3 space-y-2">
                                            {/* Progress Bar */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                                                    <div
                                                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Subtask List */}
                                            {task.subtasks?.map(subtask => (
                                                <div key={subtask.id} className="flex items-center gap-2 text-xs group/sub">
                                                    <button
                                                        onClick={() => handleToggleSubtask(subtask.id, !subtask.completed, task.id)}
                                                        className={`text-muted-foreground hover:text-primary transition-colors ${subtask.completed ? "text-primary" : ""}`}
                                                    >
                                                        {subtask.completed ? <CheckSquare size={12} /> : <Square size={12} />}
                                                    </button>
                                                    <span className={`flex-1 ${subtask.completed ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
                                                        {subtask.title}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteSubtask(subtask.id, task.id)}
                                                        className="text-muted-foreground/50 hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Add Subtask Input */}
                                            <form
                                                onSubmit={(e) => handleAddSubtask(e, task.id)}
                                                className="flex items-center gap-2 mt-1"
                                                onClick={(e) => e.stopPropagation()} // Prevent drag start when clicking input
                                            >
                                                <Plus size={12} className="text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={newSubtaskTitles[task.id] || ""}
                                                    onChange={(e) => setNewSubtaskTitles(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                    placeholder="Add subtask..."
                                                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                                                />
                                            </form>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar size={10} />
                                                {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            {tasks.filter(t => t.status === col.id).length === 0 && (
                                <div className="h-24 border-2 border-dashed border-muted rounded-md flex items-center justify-center text-muted-foreground text-sm italic">
                                    Drop tasks here
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
