import boxen from 'boxen';
import { Chalk } from 'chalk';

const isInteractive = Boolean(process.stdout?.isTTY);
const colorsEnabled = isInteractive && process.env.FORCE_COLOR !== '0' && !('NO_COLOR' in process.env);

const color = new Chalk({ level: colorsEnabled ? 3 : 0 });

export const theme = {
  primary: color.cyanBright,
  success: color.hex('#00FF88'),
  warning: color.hex('#FFD166'),
  error: color.hex('#EF476F'),
  accent: color.magentaBright
};

export function success(message: string): void {
  const text = theme.success(`[OK] ${message}`);

  if (!isInteractive) {
    console.log(text);
    return;
  }

  try {
    console.log(
      boxen(text, {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'round'
      })
    );
  } catch {
    console.log(text);
  }
}

export function info(message: string): void {
  console.log(theme.primary(message));
}

export function warning(message: string): void {
  console.warn(theme.warning(`[WARN] ${message}`));
}

export function error(message: string): void {
  console.error(theme.error(`[ERROR] ${message}`));
}