/** Tracks open modals so only the topmost receives Escape / backdrop dismiss. */
const stack: string[] = [];

export function registerModal(id: string) {
  stack.push(id);
}

export function unregisterModal(id: string) {
  const idx = stack.lastIndexOf(id);
  if (idx >= 0) stack.splice(idx, 1);
}

export function isTopModal(id: string) {
  return stack.length > 0 && stack[stack.length - 1] === id;
}
