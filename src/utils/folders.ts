export function folderPermissionMessage(action: "change" | "rename" | "delete") {
  return `Only the folder owner or an admin can ${action} this folder.`;
}

export function folderActionErrorMessage(err: unknown, action: "change" | "rename" | "delete") {
  const message = err instanceof Error ? err.message : "";
  if (message.toLowerCase().includes("owner") && message.toLowerCase().includes("admin")) {
    return folderPermissionMessage(action);
  }
  return message || `Could not ${action} folder.`;
}
