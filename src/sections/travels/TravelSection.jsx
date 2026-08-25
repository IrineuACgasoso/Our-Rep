import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { pushView, popView } from '../../hooks/navstack';
import DestinationsList from './DestinationsList';
import TravelDetail from './TravelDetail';

export default function TravelsSection() {
  const { travelsData, reopenTravelKey, setReopenTravelKey } = useApp();
  const [openKey, setOpenKey] = useState(null);

  function openDetail(key) {
    setOpenKey(key);
    pushView('travel-detail', () => setOpenKey(null));
  }

  function closeDetail() {
    setOpenKey(null);
    popView('travel-detail');
  }

  // Depois de cadastrar um restaurante vinculado a uma viagem (fluxo Restaurantes → Viagens),
  // reabre automaticamente o detalhe daquela viagem.
  useEffect(() => {
    if (reopenTravelKey) {
      openDetail(reopenTravelKey);
      setReopenTravelKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reopenTravelKey]);

  const dest = openKey ? travelsData[openKey] : null;

  if (openKey && dest) {
    return <TravelDetail travelKey={openKey} dest={dest} onBack={closeDetail} />;
  }

  return <DestinationsList onOpen={openDetail} />;
}