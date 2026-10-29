// How to install the app on this device, or null when it is already installed (standalone).
//  'ios': the user agent contains 'iPhone' or 'iPad', or it contains 'Macintosh' while maxTouchPoints > 1.
//  'other': anything else.
export function installHint(userAgent: string, maxTouchPoints: number, standalone: boolean): 'ios' | 'other' | null {
  if (standalone) return null
  const isiPhone = userAgent.includes('iPhone')
  const isiPad = userAgent.includes('Macintosh') && maxTouchPoints > 1
  if (isiPhone || isiPad) return 'ios'
  return 'other'
}

// The text to show for each hint.
export function installText(hint: 'ios' | 'other'): string {
  if (hint === 'ios') {
    return 'To install Calbud: tap Share, then Add to Home Screen.'
  }
  return 'To install Calbud: open the browser menu, then Install app or Add to Home screen.'
}
