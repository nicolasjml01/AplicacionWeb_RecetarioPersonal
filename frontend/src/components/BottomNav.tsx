import { NavLink } from "react-router-dom";

type BottomNavMode = "bottom" | "sidebar";

type BottomNavProps = {
  mode?: BottomNavMode;
};

/** User-facing labels (Spanish). Icon paths must match `public/` filenames (case-sensitive on many servers). */
const NAV_ITEMS = [
  { path: "/home", label: "Inicio", icon: "/logoHome.png" },
  { path: "/calendar", label: "Calendario", icon: "/logoCalendar.png" },
  { path: "/shopping", label: "Cesta", icon: "/logoShoppingList.png" },
  { path: "/account", label: "Cuenta", icon: "/LogoMyAccount.png" },
] as const;

export function BottomNav({ mode = "bottom" }: BottomNavProps) {
  const navClass = `bottom-nav bottom-nav--${mode}`;
  const listClass = `bottom-nav__list bottom-nav__list--${mode}`;
  const linkClassBase = `bottom-nav__link bottom-nav__link--${mode}`;

  return (
    <nav className={navClass} role="navigation" aria-label="Navegación principal">
      <ul className={listClass}>
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <li key={path} className="bottom-nav__item">
            <NavLink
              to={path}
              className={({ isActive }) =>
                `${linkClassBase} ${isActive ? "bottom-nav__link--active" : ""}`
              }
              end={path === "/home"}
            >
              <img src={icon} alt="" className="bottom-nav__icon" width={24} height={24} />
              <span className="bottom-nav__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}