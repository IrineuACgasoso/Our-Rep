import { ref, remove } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useToast } from '../../context/ToastContext';
import SafeImage from '../../components/SafeImage';
import { safeExternalUrl } from '../../utils/utils';

/** Tela de detalhe de uma receita. Substitui openRecipeDetail() do recipes.js original. */
export default function RecipeDetail({ recipeKey, recipe, onBack, onEdit }) {
  const showToast = useToast();

  async function handleDelete() {
    if (!window.confirm('Remover esta receita?')) return;
    try {
      await remove(ref(db, `recipes/${recipeKey}`));
      showToast('Receita removida.');
      onBack();
    } catch {
      showToast('Erro ao remover receita.');
    }
  }

  const ingredients = recipe.ingredients || [];

  return (
    <div id="recipeDetailView">
      <button type="button" className="rest-action-btn" onClick={onBack} style={{ marginBottom: '.75rem' }}>
        ← Voltar
      </button>
      <div className="recipe-detail-card">
        <SafeImage
          className="recipe-detail-img"
          placeholderClassName="recipe-detail-placeholder"
          placeholder="🍇"
          src={recipe.image}
        />
        <div className="recipe-detail-body">
          <h2>{recipe.name}</h2>
          <h4>Ingredientes</h4>
          <ul className="recipe-detail-ings">
            {ingredients.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
          {recipe.instructions && (
            <>
              <h4>Maneira de fazer</h4>
              <p className="recipe-detail-instr">{recipe.instructions}</p>
            </>
          )}
          <div className="recipe-detail-actions">
            {recipe.link && (
              <button type="button" className="rest-action-btn" onClick={() => window.open(safeExternalUrl(recipe.link), '_blank', 'noopener,noreferrer')}>
                🔗 Ver origem
              </button>
            )}
            <button type="button" className="rest-action-btn" onClick={() => onEdit(recipeKey)}>
              ✏️ Editar
            </button>
            <button type="button" className="rest-action-btn danger" onClick={handleDelete}>
              🗑️ Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
