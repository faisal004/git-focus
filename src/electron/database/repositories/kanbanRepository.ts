import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

export type KanbanStatus = "todo" | "in-progress" | "done";

export type KanbanSubtask = {
    id: string;
    taskId: string;
    title: string;
    completed: boolean;
    createdAt: number;
};

export type KanbanTask = {
    id: string;
    title: string;
    description: string;
    status: KanbanStatus;
    dueDate?: number;
    createdAt: number;
    subtasks: KanbanSubtask[];
};

type KanbanTaskRow = {
    id: string;
    title: string;
    description: string;
    status: string;
    due_date: number | null;
    created_at: number;
};

type KanbanSubtaskRow = {
    id: string;
    task_id: string;
    title: string;
    completed: number;
    created_at: number;
};

function rowToTask(row: KanbanTaskRow, subtasks: KanbanSubtask[] = []): KanbanTask {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status as KanbanStatus,
        dueDate: row.due_date || undefined,
        createdAt: row.created_at,
        subtasks,
    };
}

function rowToSubtask(row: KanbanSubtaskRow): KanbanSubtask {
    return {
        id: row.id,
        taskId: row.task_id,
        title: row.title,
        completed: row.completed === 1,
        createdAt: row.created_at,
    };
}

export function createKanbanRepository(db: Database.Database) {
    const insertTask = db.prepare(`
    INSERT INTO kanban_tasks (id, title, description, status, due_date, created_at)
    VALUES (@id, @title, @description, @status, @due_date, @created_at)
  `);

    const updateTask = db.prepare(`
    UPDATE kanban_tasks 
    SET title = @title, description = @description, status = @status, due_date = @due_date
    WHERE id = @id
  `);

    const updateStatus = db.prepare(`
    UPDATE kanban_tasks SET status = ? WHERE id = ?
  `);

    const deleteTask = db.prepare(`DELETE FROM kanban_tasks WHERE id = ?`);
    const findAllStmt = db.prepare(`SELECT * FROM kanban_tasks ORDER BY created_at DESC`);

    // Subtasks
    const insertSubtask = db.prepare(`
    INSERT INTO kanban_subtasks (id, task_id, title, completed, created_at)
    VALUES (@id, @task_id, @title, @completed, @created_at)
  `);

    const toggleSubtask = db.prepare(`
    UPDATE kanban_subtasks SET completed = ? WHERE id = ?
  `);

    const deleteSubtask = db.prepare(`DELETE FROM kanban_subtasks WHERE id = ?`);
    const findAllSubtasksStmt = db.prepare(`SELECT * FROM kanban_subtasks ORDER BY created_at ASC`);

    return {
        create(task: Omit<KanbanTask, "id" | "createdAt" | "subtasks">): KanbanTask {
            const newTask: KanbanTask = {
                id: uuidv4(),
                title: task.title,
                description: task.description,
                status: task.status,
                dueDate: task.dueDate,
                createdAt: Date.now(),
                subtasks: [],
            };

            insertTask.run({
                id: newTask.id,
                title: newTask.title,
                description: newTask.description,
                status: newTask.status,
                due_date: newTask.dueDate || null,
                created_at: newTask.createdAt,
            });

            return newTask;
        },

        findAll(): KanbanTask[] {
            const tasks = findAllStmt.all() as KanbanTaskRow[];
            const subtasks = findAllSubtasksStmt.all() as KanbanSubtaskRow[];
            const subtasksMap = new Map<string, KanbanSubtask[]>();

            for (const row of subtasks) {
                const subtask = rowToSubtask(row);
                if (!subtasksMap.has(subtask.taskId)) {
                    subtasksMap.set(subtask.taskId, []);
                }
                subtasksMap.get(subtask.taskId)?.push(subtask);
            }

            return tasks.map(t => rowToTask(t, subtasksMap.get(t.id) || []));
        },

        update(task: KanbanTask): KanbanTask {
            updateTask.run({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                due_date: task.dueDate || null,
            });
            return task;
        },

        updateStatus(id: string, status: KanbanStatus): void {
            updateStatus.run(status, id);
        },

        delete(id: string): void {
            deleteTask.run(id);
        },

        // Subtasks
        createSubtask(subtask: Omit<KanbanSubtask, "id" | "createdAt" | "completed">): KanbanSubtask {
            const newSubtask: KanbanSubtask = {
                id: uuidv4(),
                taskId: subtask.taskId,
                title: subtask.title,
                completed: false,
                createdAt: Date.now(),
            };

            insertSubtask.run({
                id: newSubtask.id,
                task_id: newSubtask.taskId,
                title: newSubtask.title,
                completed: 0,
                created_at: newSubtask.createdAt,
            });

            return newSubtask;
        },

        toggleSubtask(id: string, completed: boolean): void {
            toggleSubtask.run(completed ? 1 : 0, id);
        },

        deleteSubtask(id: string): void {
            deleteSubtask.run(id);
        }
    };
}

export type KanbanRepository = ReturnType<typeof createKanbanRepository>;
