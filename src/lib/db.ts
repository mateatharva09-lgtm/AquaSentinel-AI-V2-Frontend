/**
 * Local database (IndexedDB via Dexie). Data stays in the user's browser on their computer,
 * so the app runs offline without any server, account or API key.
 *
 * Schema v1
 *   samples: ++id, collectedAt, siteName, createdAt
 *     fields: label, siteName, waterSource, latitude, longitude, collectedAt, notes, isDemo,
 *             createdAt, ph, turbidity, dissolvedOxygen, conductivity, temperature,
 *             mlResult (Isolation Forest backend answer, not indexed; null/absent = not checked)
 */
import Dexie, { type EntityTable } from "dexie";
import { buildDemoSamples } from "./water/demo-data";
import type { Sample } from "./water/types";
import type { MlResult } from "./water/ml";

export type AquaDatabase = Dexie & { samples: EntityTable<Sample, "id"> };

let instance: AquaDatabase | null = null;

export function getDb(): AquaDatabase {
  if (instance) return instance;
  const db = new Dexie("aquasentinel") as AquaDatabase;
  db.version(1).stores({ samples: "++id, collectedAt, siteName, createdAt" });
  // Runs once, when the database is first created in this browser.
  db.on("populate", (tx) => {
    tx.table("samples").bulkAdd(buildDemoSamples());
  });
  instance = db;
  return db;
}

export async function addSample(sample: Omit<Sample, "id">): Promise<number> {
  return (await getDb().samples.add(sample as Sample)) as number;
}

export async function saveMlResult(id: number, mlResult: MlResult) {
  await getDb().samples.update(id, (row) => {
    row.mlResult = mlResult;
  });
}

export async function deleteSample(id: number) {
  await getDb().samples.delete(id);
}

export async function removeDemoData() {
  await getDb().samples.filter((s) => s.isDemo).delete();
}

export async function restoreDemoData() {
  await removeDemoData();
  await getDb().samples.bulkAdd(buildDemoSamples());
}
