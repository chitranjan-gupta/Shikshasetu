import ReactDOM from 'react-dom/client';

import '@/lib/i18n';
import { Menu } from '@/components/menu';
import { RightClickMenu } from '@/components/dropdown-autofill';
import { ensureMenuStyles } from '@/content-menu';

export function getRoot(
  customMenu: ReactDOM.Container,
  event: Event,
  autofills: [string, unknown][]
) {
  const root = ReactDOM.createRoot(customMenu);
  root.render(
    <Menu title="Autofill details" event={event} items={autofills} />
  );
  return root;
}

export function setRoot(
  customMenu: ReactDOM.Container,
  event: Event,
  autofills: [string, unknown][],
  document_files: Map<string, object>,
  existingRoot?: ReactDOM.Root
) {
  try {
    ensureMenuStyles((customMenu as any)?.getRootNode?.()?.host);
  } catch {
    // ignore
  }
  const root = existingRoot ?? ReactDOM.createRoot(customMenu);
  root.render(
    <RightClickMenu
      title="Autofill details"
      event={event}
      items={autofills}
      document_files={document_files}
    />
  );
  return root;
}
