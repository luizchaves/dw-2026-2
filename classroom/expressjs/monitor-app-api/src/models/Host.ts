import { randomUUID } from 'node:crypto';

import Database from '@/database/database.ts';
import type { Host, HostInput } from '@/types/Host.d.ts';

const searchableFields = ['name', 'address'] as const;

type SearchableField = (typeof searchableFields)[number];

function isSearchableField(field: string): field is SearchableField {
  return (searchableFields as readonly string[]).includes(field);
}

async function create({ name, address }: HostInput): Promise<Host> {
  if (!name || !address) {
    throw new Error('Unable to create host');
  }

  const db = await Database.connect();

  const id = randomUUID();

  const sql = `
    INSERT INTO
      hosts (id, name, address)
    VALUES
      (?, ?, ?)
  `;

  await db.run(sql, [id, name, address]);

  const newHost = (await db.get(
    'SELECT id, name, address FROM hosts WHERE id = ?',
    [id],
  )) as Host | undefined;

  await db.close();

  if (!newHost) {
    throw new Error('Unable to create host');
  }

  return newHost;
}

async function read(field?: keyof Host, value?: string): Promise<Host[]> {
  const db = await Database.connect();

  let hosts: Host[];

  if (field && value) {
    if (!isSearchableField(field)) {
      await db.close();

      throw new Error('Unable to read hosts');
    }

    const sql = `
      SELECT id, name, address
      FROM hosts
      WHERE ${field} LIKE ?
    `;

    hosts = (await db.all(sql, [`%${value}%`])) as unknown as Host[];
  } else {
    const sql = 'SELECT id, name, address FROM hosts';

    hosts = (await db.all(sql)) as unknown as Host[];
  }

  await db.close();

  return hosts;
}

async function readById(id: string): Promise<Host> {
  const db = await Database.connect();

  const sql = `
    SELECT id, name, address
    FROM hosts
    WHERE id = ?
  `;

  const host = (await db.get(sql, [id])) as Host | undefined;

  await db.close();

  if (!host) {
    throw new Error('Host not found');
  }

  return host;
}

async function update({
  id,
  name,
  address,
}: HostInput & { id?: string }): Promise<Host> {
  if (!id || !name || !address) {
    throw new Error('Unable to update host');
  }

  const db = await Database.connect();

  const sql = `
    UPDATE hosts
    SET name = ?, address = ?
    WHERE id = ?
  `;

  const { changes } = await db.run(sql, [name, address, id]);

  await db.close();

  if (changes !== 1) {
    throw new Error('Host not found');
  }

  return { id, name, address };
}

async function remove(id: string): Promise<boolean> {
  const db = await Database.connect();

  const sql = 'DELETE FROM hosts WHERE id = ?';

  const { changes } = await db.run(sql, [id]);

  await db.close();

  if (changes !== 1) {
    throw new Error('Host not found');
  }

  return true;
}

export default { create, read, readById, update, remove };
