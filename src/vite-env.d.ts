/// <reference types="vite/client" />

// File System Access API surface missing from TS lib.dom (Chromium implements these).
interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>
  keys(): AsyncIterableIterator<string>
  queryPermission?(desc?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission?(desc?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}

interface FileSystemFileHandle {
  queryPermission(desc?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(desc?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}
