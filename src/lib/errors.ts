export function friendlyError(message: string): string {
  let msg = message
    .replace(/^create_household: /, '')
    .replace(/^join_household: /, '')
  msg = msg.charAt(0).toUpperCase() + msg.slice(1)
  if (!msg.endsWith('.')) msg += '.'
  return msg
}
