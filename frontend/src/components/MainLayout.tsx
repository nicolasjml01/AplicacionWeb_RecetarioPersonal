import { Outlet } from "react-router-dom";
import { IngredientCatalogPreloader } from "./ingredient/IngredientCatalogPreloader";
import { BottomNav } from "./BottomNav";

export function MainLayout() {
  return (
    <div className="app-shell">
      <IngredientCatalogPreloader />
      <aside className="app-sidebar">
        <BottomNav mode="sidebar" />
      </aside>

      <main className="app-content">
        <div className="app-page">
          <Outlet />
        </div>
      </main>

      <div className="app-bottom-nav">
        <BottomNav mode="bottom" />
      </div>
    </div>
  );
}