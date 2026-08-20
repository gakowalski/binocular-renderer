import { setupProfileUi, type LiveCalibrationState } from './profile-ui';
import type { CalibrationProfile, ProfileTargetType } from './profile';
import type { Side, TranslationLinkMode, ViewTransform } from '../renderer/transform';

requiredElement<HTMLElement>('.toolbar__identity span').textContent = 'M4 · calibration profiles';

setupProfileUi({
  appVersion: '0.4.0',
  getState: readCalibrationState,
  applyProfile,
});

function readCalibrationState(): LiveCalibrationState {
  return {
    transforms: {
      left: readViewTransform('left'),
      right: readViewTransform('right'),
    },
    translationLinkMode: readTranslationLinkMode(),
    targetType: readTargetType(),
    uniformScale: {
      left: requiredElement<HTMLInputElement>('#left-uniform-scale').checked,
      right: requiredElement<HTMLInputElement>('#right-uniform-scale').checked,
    },
  };
}

function readViewTransform(side: Side): ViewTransform {
  return {
    offsetX: numericControlValue(side, 'offsetX'),
    offsetY: numericControlValue(side, 'offsetY'),
    rotationDeg: numericControlValue(side, 'rotation'),
    scaleX: numericControlValue(side, 'scaleX'),
    scaleY: numericControlValue(side, 'scaleY'),
  };
}

function applyProfile(profile: CalibrationProfile): void {
  setSelectValue('#link-mode', 'independent');

  for (const side of ['left', 'right'] as const) {
    setCheckboxValue(`#${side}-uniform-scale`, false);
  }

  for (const side of ['left', 'right'] as const) {
    const transform = profile.transforms[side];
    setNumericControl(side, 'offsetX', transform.offsetX);
    setNumericControl(side, 'offsetY', transform.offsetY);
    setNumericControl(side, 'rotation', transform.rotationDeg);
    setNumericControl(side, 'scaleX', transform.scaleX);
    setNumericControl(side, 'scaleY', transform.scaleY);
  }

  setSelectValue('#target-type', profile.ui.targetType);
  setCheckboxValue('#left-uniform-scale', profile.ui.uniformScale.left);
  setCheckboxValue('#right-uniform-scale', profile.ui.uniformScale.right);
  setSelectValue('#link-mode', profile.ui.translationLinkMode);
}

function numericControlValue(side: Side, id: string): number {
  const value = requiredElement<HTMLInputElement>(`#${side}-${id}-number`).valueAsNumber;
  if (!Number.isFinite(value)) {
    throw new Error(`Calibration control ${side}.${id} does not contain a finite number.`);
  }
  return value;
}

function setNumericControl(side: Side, id: string, value: number): void {
  const input = requiredElement<HTMLInputElement>(`#${side}-${id}-number`);
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setCheckboxValue(selector: string, checked: boolean): void {
  const input = requiredElement<HTMLInputElement>(selector);
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setSelectValue(selector: string, value: string): void {
  const select = requiredElement<HTMLSelectElement>(selector);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function readTranslationLinkMode(): TranslationLinkMode {
  return requiredElement<HTMLSelectElement>('#link-mode').value === 'symmetric' ? 'symmetric' : 'independent';
}

function readTargetType(): ProfileTargetType {
  const value = requiredElement<HTMLSelectElement>('#target-type').value;
  if (value === 'cross' || value === 'grid' || value === 'frame' || value === 'radial') {
    return value;
  }
  return 'cross';
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}
