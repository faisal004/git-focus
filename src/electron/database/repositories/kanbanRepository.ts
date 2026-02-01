import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

export type KanbanStatus = "todo" | "in-progress" | "done";

export type KanbanTask = {
    id: string;
    title: string;
    description: string;
    status: KanbanStatus;
    dueDate?: number;
    createdAt: number;
};

type KanbanTaskRow = {
    id: string;
    title: string;
    description: string;
    status: string;
    due_date: number | null;
    created_at: number;
};

function rowToTask(row: KanbanTaskRow): KanbanTask {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status as KanbanStatus,
        dueDate: row.due_date || undefined,
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

    return {
        create(task: Omit<KanbanTask, "id" | "createdAt">): KanbanTask {
            const newTask: KanbanTask = {
                id: uuidv4(),
                title: task.title,
                description: task.description,
                status: task.status,
                dueDate: task.dueDate,
                createdAt: Date.now(),
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
            const rows = findAllStmt.all() as KanbanTaskRow[];
            return rows.map(rowToTask);
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
    };
}

export type KanbanRepository = ReturnType<typeof createKanbanRepository>;
