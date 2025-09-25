import styles from '../styles/Tabs.module.css';

interface TabOption {
  id: string;
  label: string;
}

interface TabsProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ options, activeId, onChange }: TabsProps) {
  return (
    <div className={styles.tabs} role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          role="tab"
          aria-selected={activeId === option.id}
          className={activeId === option.id ? styles.activeTab : styles.tab}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
