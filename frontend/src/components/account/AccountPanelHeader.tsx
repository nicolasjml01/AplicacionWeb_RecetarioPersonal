type Props = {
  title: string;
  onBack: () => void;
  backLabel?: string;
};

export function AccountPanelHeader({ title, onBack, backLabel = "Volver a cuenta" }: Props) {
  return (
    <header className="account-page__header category-recipes-header">
      <button type="button" className="category-recipes-back" onClick={onBack} aria-label={backLabel}>
        ←
      </button>
      <h1 className="category-recipes-title account-page__panel-title">{title}</h1>
    </header>
  );
}
