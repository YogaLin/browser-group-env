import type { ActiveContext, Env, GlobalState } from "../model/env";
import { ICON_LAYER_COLOR, getGroupColorHex } from "../model/group-color";

type IconTone = "active" | "disabled";

const ICON_SIZES = [16, 32, 48, 128] as const;
const ACTIVE_COLOR = "#2563ff";
const DISABLED_COLOR = "#9aa0a6";
const WINDOW_DOTS = {
  red: "#ff5f57",
  yellow: "#ffbd2e",
  green: "#28c840"
};

export async function updateActionIcon(
  state: GlobalState,
  context: ActiveContext
): Promise<void> {
  if (!chrome.action) {
    return;
  }

  const actionEnv = getActionEnv(state, context);
  const active = Boolean(actionEnv);
  const activeColor = getGroupColorHex(context.groupColor);
  await chrome.action.setIcon({
    imageData: createIconSet(active ? "active" : "disabled", activeColor)
  });
  await chrome.action.setBadgeText({
    text: ""
  });
}

export function getActionEnv(state: GlobalState, context: ActiveContext): Env | undefined {
  if (!state.enabled) {
    return undefined;
  }
  const groupEnv = context.groupKey
    ? state.envs[state.groupBindings[context.groupKey]?.envId]
    : undefined;
  return [groupEnv, ...Object.values(state.envs).filter((candidate) => candidate.scope === "global")]
    .find(isActionEnv);
}

function isActionEnv(env: Env | undefined): env is Env {
  return Boolean(env?.enabled && env.filters.domains.length > 0);
}

function createIconSet(tone: IconTone, activeColor = ACTIVE_COLOR): Record<number, ImageData> {
  return Object.fromEntries(
    ICON_SIZES.map((size) => [size, drawIcon(size, tone, activeColor)])
  ) as Record<number, ImageData>;
}

function drawIcon(size: number, tone: IconTone, activeColor: string): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create icon canvas context");
  }
  const scale = size / 128;
  const color = tone === "active" ? activeColor : DISABLED_COLOR;

  context.clearRect(0, 0, size, size);
  drawTabGroupEnvIcon(context, scale, color, tone);

  return context.getImageData(0, 0, size, size);
}

function drawTabGroupEnvIcon(
  context: OffscreenCanvasRenderingContext2D,
  scale: number,
  color: string,
  tone: IconTone
) {
  const middleColor = tone === "active" ? ICON_LAYER_COLOR : "#b7babd";

  context.fillStyle = middleColor;
  roundedRect(context, 8 * scale, 12 * scale, 112 * scale, 40 * scale, 18 * scale);
  context.fill();

  context.fillStyle = color;
  roundedRect(context, 0 * scale, 28 * scale, 128 * scale, 98 * scale, 20 * scale);
  context.fill();

  context.fillStyle = tone === "active" ? WINDOW_DOTS.red : "#d1d5db";
  roundedRect(context, 12 * scale, 40 * scale, 11 * scale, 11 * scale, 5.5 * scale);
  context.fill();
  context.fillStyle = tone === "active" ? WINDOW_DOTS.yellow : "#c4c7c5";
  roundedRect(context, 29 * scale, 40 * scale, 11 * scale, 11 * scale, 5.5 * scale);
  context.fill();
  context.fillStyle = tone === "active" ? WINDOW_DOTS.green : "#b7babd";
  roundedRect(context, 46 * scale, 40 * scale, 11 * scale, 11 * scale, 5.5 * scale);
  context.fill();

  drawEnvText(context, scale);
}

function drawEnvText(context: OffscreenCanvasRenderingContext2D, scale: number) {
  context.fillStyle = "#ffffff";
  context.font = `700 ${43 * scale}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("ENV", 64 * scale, 95 * scale);
}

function roundedRect(
  context: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
