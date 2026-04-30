import { NavLink } from "react-router-dom";

type BottomNavMode = "bottom" | "sidebar";

type BottomNavProps = {
  mode?: BottomNavMode;
};

const NAV_ITEMS = [
  { path: "/home", label: "Home", icon: "/logoHome.png" },
  { path: "/calendar", label: "Calendar", icon: "/logoCalendar.png" },
  { path: "/shopping", label: "Shopping", icon: "/logoShoppingList.png" },
  { path: "/account", label: "Account", icon: "/logoMyAccount.png" },
] as const;

export function BottomNav({ mode = "bottom" }: BottomNavProps) {
  const navClass = `bottom-nav bottom-nav--${mode}`;
  const listClass = `bottom-nav__list bottom-nav__list--${mode}`;
  const linkClassBase = `bottom-nav__link bottom-nav__link--${mode}`;

  return (
    <nav className={navClass} role="navigation" aria-label="Main navigation">
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