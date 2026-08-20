import './main';
import './calibration/profile.css';

async function bootstrapOptionalUi(): Promise<void> {
  await import('./calibration/profile-bootstrap');
  await import('./stereo/stereo-bootstrap');
}

void bootstrapOptionalUi().catch((error: unknown) => {
  console.error('Failed to initialize application extensions.', error);
});
