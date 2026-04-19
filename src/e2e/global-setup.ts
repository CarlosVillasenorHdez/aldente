/**
 * global-setup.ts — corre UNA VEZ antes de todos los tests
 * Crea el directorio de autenticación si no existe
 */
import { mkdir, writeFile, access } from 'fs/promises';
import path from 'path';

export default async function globalSetup() {
  const authDir = path.join(process.cwd(), 'src/e2e/.auth');
  try {
    await mkdir(authDir, { recursive: true });
    // Inicializar storageState vacío si no existe
    const authFile = path.join(authDir, 'user.json');
    try {
      await access(authFile);
    } catch {
      await writeFile(authFile, JSON.stringify({ cookies: [], origins: [] }));
    }
  } catch {
    // Directorio ya existe
  }
}
