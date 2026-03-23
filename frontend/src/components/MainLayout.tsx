import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function MainLayout() {
  return (
    <div className="main-layout">
      <main className="main-layout__content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
