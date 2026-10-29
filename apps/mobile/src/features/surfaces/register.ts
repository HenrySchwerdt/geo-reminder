/**
 * Platform adapters for the surfaces hub. Each adapter module calls `registerSurface` when imported and is a
 * no-op on platforms it doesn't support (use `.ios.ts` / `.android.ts` / `.web.ts` files where needed).
 * Imported once from the root layout and from background tasks.
 */
import '@/features/reminders';
import './adapters/watch';
import './adapters/wear';
import './adapters/widgets';
