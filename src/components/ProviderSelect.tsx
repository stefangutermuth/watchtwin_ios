import { providers } from '../data/providers';
import { useStore } from '../store/useStore';

export function ProviderSelect() {
  const selectedProviders = useStore((s) => s.selectedProviders);
  const toggleProvider = useStore((s) => s.toggleProvider);

  return (
    <div className="grid grid-cols-3 gap-3">
      {providers.map((p) => {
        const isSelected = selectedProviders.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => toggleProvider(p.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              isSelected
                ? 'border-wt-pink bg-wt-pink/10'
                : 'border-wt-surface bg-wt-surface/50'
            }`}
          >
            <img src={p.logo} alt={p.name} className="h-10 w-10 rounded-lg" />
            <span
              className={`text-xs font-medium ${
                isSelected ? 'text-orange-400' : 'text-gray-400'
              }`}
            >
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
