import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as tar from 'tar';
import docker from '@/lib/docker';

const CONTAINER_NAME = process.env.DOCKER_CONTAINER_NAME || 'tailcraft-mc-local';
const WORLD_PATH = path.resolve(process.cwd(), '../data/world');
const BACKUPS_DIR = path.resolve(process.cwd(), '../data/backups');
const PROPERTIES_PATH = path.resolve(process.cwd(), '../data/server.properties');

interface ResetPayload {
  seed: string;
  levelType: string;
  difficulty: string;
  hardcore: boolean;
  generateStructures: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResetPayload = await request.json();
    const { seed, levelType, difficulty, hardcore, generateStructures } = body;

    // 1. Safety Guard: Ensure server container is STOPPED
    try {
      const container = docker.getContainer(CONTAINER_NAME);
      const data = await container.inspect();
      if (data.State.Running) {
        return NextResponse.json(
          { success: false, error: 'Server must be stopped before resetting the world.' },
          { status: 400 }
        );
      }
    } catch {
      // Container not running or not found; safe to proceed
    }

    // 2. Take Pre-Reset Safety Backup
    let safetyBackupName = '';
    try {
      await fs.access(WORLD_PATH);
      await fs.mkdir(BACKUPS_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      safetyBackupName = `pre-reset-safety-${timestamp}.tar.gz`;
      const safetyBackupPath = path.join(BACKUPS_DIR, safetyBackupName);

      await tar.c(
        {
          gzip: true,
          file: safetyBackupPath,
          cwd: path.dirname(WORLD_PATH),
        },
        ['world']
      );
    } catch {
      // World folder did not exist; skip backup
    }

    // 3. Wipe World Directory
    try {
      await fs.rm(WORLD_PATH, { recursive: true, force: true });
    } catch {
      // Folder was already clean
    }
    await fs.mkdir(WORLD_PATH, { recursive: true });

    // Ensure UID 1000 ownership on newly created directory
    try {
      await fs.chown(WORLD_PATH, 1000, 1000);
    } catch {
      // Ignore on non-POSIX or unprivileged hosts
    }

    // 4. Update server.properties cleanly (strip escaped colons)
    try {
      let content = await fs.readFile(PROPERTIES_PATH, 'utf-8');

      const cleanLevelType = (levelType || 'minecraft:normal').replace(/\\:/g, ':');

      const updates: Record<string, string> = {
        'level-seed': seed ?? '',
        'level-type': cleanLevelType,
        'difficulty': difficulty ?? 'easy',
        'hardcore': String(hardcore ?? false),
        'generate-structures': String(generateStructures ?? true),
      };

      for (const [key, val] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${val}`);
        } else {
          content += `\n${key}=${val}`;
        }
      }

      // Clean up any surviving escaped colons across the entire file
      content = content.replace(/\\:/g, ':');

      await fs.writeFile(PROPERTIES_PATH, content, 'utf-8');
    } catch (err: unknown) {
      console.warn('Could not update server.properties during reset:', err);
    }

    return NextResponse.json({
      success: true,
      message: safetyBackupName
        ? `World reset complete! Saved pre-reset backup as "${safetyBackupName}".`
        : 'World reset complete!',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset world';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}