import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, ArrowRight } from 'lucide-react';
import Modal from '../Modal';
import { MetricCardMetadata, getAllMetricCards, organizeCardsByCategory, CardCategory } from '../../lib/analyticsService';

interface CardSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleCards: string[];
  onToggleCard: (cardId: string, visible: boolean) => void;
}

const categoryLabels: Record<CardCategory, string> = {
  overview: 'Overview',
  revenue: 'Revenue',
  expenses: 'Expenses',
  inventory: 'Inventory',
  ads: 'Ads & Marketing',
  financial: 'Financial Metrics',
  balance: 'Balance'
};

export default function CardSelectorModal({
  isOpen,
  onClose,
  visibleCards,
  onToggleCard
}: CardSelectorModalProps) {
  const [allCards, setAllCards] = useState<MetricCardMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCards();
    }
  }, [isOpen]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const cards = await getAllMetricCards();
      setAllCards(cards);
    } catch (error) {
      console.error('Error loading metric cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = allCards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const organizedCards = organizeCardsByCategory(filteredCards);

  const handleToggle = (cardId: string) => {
    const isVisible = visibleCards.includes(cardId);
    onToggleCard(cardId, !isVisible);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Metrics"
      maxWidth="max-w-xl"
    >
      <>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search metrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          />
        </div>

        {/* Cards by Category */}
        <div className="max-h-[60vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading metrics...
            </div>
          ) : (
            Object.entries(organizedCards).map(([category, cards]) => {
              if (cards.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    {categoryLabels[category as CardCategory]}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {cards.map((card) => {
                      const isVisible = visibleCards.includes(card.id);

                      return (
                        <button
                          key={card.id}
                          onClick={() => handleToggle(card.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isVisible
                              ? 'bg-gray-50 dark:bg-[#2a2a2a] border-gray-900 dark:border-gray-300'
                              : 'bg-white dark:bg-dark border-gray-200 dark:border-[#333333] hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex-1 text-left">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {card.title}
                            </h4>
                            {card.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {card.description}
                              </p>
                            )}
                          </div>
                          <div className={`flex-shrink-0 ml-3 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isVisible
                              ? 'bg-gray-700 dark:bg-[#4a4a4a] border-gray-700 dark:border-[#4a4a4a]'
                              : 'bg-white dark:bg-dark border-gray-300 dark:border-[#4a4a4a]'
                          }`}>
                            {isVisible && (
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#2a2a2a]/50 px-6 py-4 -mx-6 -mb-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {visibleCards.length} metric{visibleCards.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Done
            <ArrowRight className="btn-icon btn-icon-arrow" />
          </button>
        </div>
      </>
    </Modal>
  );
}
