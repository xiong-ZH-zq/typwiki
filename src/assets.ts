import { access, cp, mkdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { TypwikiError as WikiError } from './model.js';

const THEME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function themeStylesheetHref(baseUrl: string, themeId: string): string {
  return `${baseUrl}/assets/themes/${themeId}/theme.css`;
}

export async function publishTheme(root: string, publicDir: string, themeId: string): Promise<void> {
  validateThemeId(themeId);
  const source = resolve(root, 'assets', 'themes', themeId);
  const target = resolve(root, publicDir, 'assets', 'themes', themeId);
  const css = join(source, 'theme.css');

  try {
    await mkdir(target, { recursive: true });
    await cp(source, target, { recursive: true, force: true, errorOnExist: false });
    await access(css);
  } catch {
    throw new WikiError([{ file: relative(root, css), message: `主题缺少 theme.css: ${relative(root, css)}` }]);
  }

  const outputRelative = relative(resolve(root, publicDir), target);
  if (outputRelative === '..' || outputRelative.startsWith(`..${sep}`)) {
    throw new WikiError([{ message: `主题输出路径不安全: ${themeId}` }]);
  }
}

export function validateThemeId(themeId: string): void {
  if (!THEME_ID_PATTERN.test(themeId)) {
    throw new WikiError([{ message: `主题 ID 无效: ${themeId}` }]);
  }
}
