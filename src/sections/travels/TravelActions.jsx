import { ref, push } from 'firebase/database';
import { db } from '../../firebase/firebase';

/**
 * Chamado depois que um restaurante é cadastrado na aba Restaurantes, quando o usuário
 * veio de "Ir para aba Restaurantes →" dentro de uma viagem (categoria Culinária).
 * Vincula o restaurante recém-criado à viagem pendente e volta para a tela da viagem.
 */
export async function linkRestaurantToActiveTravel(restaurantKey, pending, setPendingTravelRestaurant, setActiveSection, showToast, setReopenTravelKey) {
  if (!pending?.travelKey) return false;
  try {
    await push(ref(db, `travels/${pending.travelKey}/cats/culinaria/items`), {
      type: 'restaurant', restaurantKey, addedAt: Date.now(),
    });
    setPendingTravelRestaurant(null);
    setReopenTravelKey?.(pending.travelKey);
    setActiveSection('travels');
    showToast('Restaurante vinculado à viagem! ✈️');
    return true;
  } catch {
    showToast('Restaurante salvo, mas falhou ao vincular à viagem.');
    return false;
  }
}