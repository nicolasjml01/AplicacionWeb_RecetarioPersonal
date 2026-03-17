import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/home', label: 'Home', icon: '/logoHome.png' },
  { path: '/calendar', label: 'Calendar', icon: '/logoCalendar.png' },
  { path: '/shopping', label: 'Shopping', icon: '/logoShoppingList.png' },
  { path: '/account', label: 'Account', icon: '/LogoMyAccount.png' },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      <ul className="bottom-nav__list">
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <li key={path} className="bottom-nav__item">
            <NavLink
              to={path}
              className={({ isActive }) =>
                `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`
              }
              end={path === '/home'}
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