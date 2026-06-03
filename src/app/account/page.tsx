import { Suspense } from "react";
import { AccountScreen } from "@/components/screens/AccountScreen";

export default function AccountPage() {
  // AccountScreen reads ?purchase= via useSearchParams, which needs a Suspense
  // boundary in Next 16 to avoid de-opting the whole route to client rendering.
  return (
    <Suspense fallback={null}>
      <AccountScreen />
    </Suspense>
  );
}
