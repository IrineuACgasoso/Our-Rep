import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { pushView, popView } from '../../hooks/navstack';
import RecipeForm from './RecipeForm';
import RecipeDetail from './RecipeDetail';

export default function RecipesSection() {
  const { recipesData } = useApp();
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [openKey, setOpenKey] = useState(null);

  const entries = useMemo(() => {
    let list = Object.entries(recipesData);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(([, r]) => r.name?.toLowerCase().includes(q));
    list.sort((a, b) => (a[1].name || '').localeCompare(b[1].name || '', 'pt-BR'));
    return list;
  }, [recipesData, search]);

  function openDetail(key) {
    setOpenKey(key);
    pushView('recipe-detail', () => setOpenKey(null));
  }

  function closeDetail() {
    setOpenKey(null);
    popView('recipe-detail');
  }

  function editFromDetail(key) {
    setEditingKey(key);
    closeDetail();
  }

  const detailRecipe = openKey ? recipesData[openKey] : null;

  if (openKey && detailRecipe) {
    return <RecipeDetail recipeKey={openKey} recipe={detailRecipe} onBack={closeDetail} onEdit={editFromDetail} />;
  }

  return (
    <div>
      <RecipeForm editingKey={editingKey} onDoneEditing={() => setEditingKey(null)} />

      <div className="rest-toolbar" style={{ paddingTop: '.5rem' }}>
        <div className="rest-toolbar-top">
          <div className="rest-search-wrap">
            <span className="rest-search-icon">🔍</span>
            <input className="rest-search" type="text" placeholder="Pesquisar receita..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="recipes-grid">
        {entries.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">🍇</div>
            <p>{search ? 'Nenhum resultado' : 'Nenhuma receita ainda'}</p>
            <span>{search ? 'Tente outra busca' : 'Cadastre a primeira acima!'}</span>
          </div>
        ) : (
          entries.map(([key, r]) => (
            <div key={key} className="recipe-card" onClick={() => openDetail(key)}>
              {r.image ? (
                <img className="recipe-img" src={r.image} alt="" onError={(e) => { e.currentTarget.outerHTML = '<div class="recipe-img-placeholder">🍇</div>'; }} />
              ) : (
                <div className="recipe-img-placeholder">🍇</div>
              )}
              <div className="recipe-info">
                <div className="recipe-title">{r.name}</div>
                <div className="recipe-ing-count">
                  {(r.ingredients || []).length} ingrediente{(r.ingredients || []).length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}