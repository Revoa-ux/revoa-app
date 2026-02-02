import React, { useState, useEffect } from 'react';
import { X, DollarSign, Package, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Modal from '../Modal';
import ModalFooter from '../ModalFooter';
import Button from '../Button';
import {
  preShipmentIssueService,
  type IssueWithDetails,
} from '@/lib/preShipmentIssueService';
import {
  issueResolutionService,
  type ResolutionProposal,
  type SubstitutionCalculation,
} from '@/lib/issueResolutionService';
import { useAdmin } from '@/contexts/AdminContext';
import { format } from 'date-fns';

interface IssueResolutionModalProps {
  issue: IssueWithDetails;
  onClose: () => void;
  onResolved: () => void;
}

export default function IssueResolutionModal({
  issue,
  onClose,
  onResolved,
}: IssueResolutionModalProps) {
  const { adminUser } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<ResolutionProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ResolutionProposal | null>(null);
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');

  // Substitution details
  const [substituteSku, setSubstituteSku] = useState('');
  const [substituteProductName, setSubstituteProductName] = useState('');
  const [substituteUnitPrice, setSubstituteUnitPrice] = useState<number>(0);
  const [substituteUnitCost, setSubstituteUnitCost] = useState<number>(0);
  const [calculation, setCalculation] = useState<SubstitutionCalculation | null>(null);

  // Refund details
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // Delay details
  const [newEstimatedDate, setNewEstimatedDate] = useState('');

  // Notes
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const proposalOptions = await issueResolutionService.proposeResolutions(issue.id);
      setProposals(proposalOptions);
    } catch (error) {
      console.error('Error loading resolution proposals:', error);
    }
  };

  const handleProposalSelect = (proposal: ResolutionProposal) => {
    setSelectedProposal(proposal);
    setStep('details');

    // Pre-fill defaults
    if (proposal.resolutionType === 'refund') {
      setRefundAmount(proposal.refundAmount || 0);
    }
  };

  const handleCalculateSubstitution = () => {
    if (!substituteSku || !substituteUnitPrice || !substituteUnitCost) {
      return;
    }

    const calc = issueResolutionService.calculateSubstitution(
      issue.original_unit_price || 0,
      issue.original_unit_cost || 0,
      0, // Original shipping
      substituteUnitPrice,
      substituteUnitCost,
      0, // Substitute shipping
      issue.affected_quantity
    );

    setCalculation(calc);
  };

  const handleSubmitResolution = async () => {
    if (!selectedProposal || !adminUser) return;

    setLoading(true);
    try {
      switch (selectedProposal.resolutionType) {
        case 'substitution':
          await issueResolutionService.executeSubstitution(
            issue.id,
            substituteSku,
            substituteProductName,
            substituteUnitPrice,
            substituteUnitCost,
            adminUser.id,
            adminNotes
          );
          break;

        case 'refund':
          await issueResolutionService.executeRefund(
            issue.id,
            refundAmount,
            adminUser.id,
            adminNotes
          );
          break;

        case 'cancellation':
          await issueResolutionService.executeCancellation(
            issue.id,
            adminUser.id,
            adminNotes
          );
          break;

        case 'delay':
          await issueResolutionService.executeDelayAcceptance(
            issue.id,
            newEstimatedDate,
            adminUser.id
          );
          break;

        default:
          // Manual resolution
          await preShipmentIssueService.createResolution({
            issueId: issue.id,
            resolutionType: selectedProposal.resolutionType,
            adminNotes,
            resolvedById: adminUser.id,
          });
      }

      onResolved();
      onClose();
    } catch (error) {
      console.error('Error submitting resolution:', error);
      alert('Failed to submit resolution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Resolve Pre-Shipment Issue">
      <div className="space-y-6">
        {/* Issue Summary */}
        <div className="bg-gray-50 dark:bg-dark rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Issue Summary</h3>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                issue.severity === 'critical'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : issue.severity === 'high'
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}
            >
              {issue.severity}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{issue.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Product:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {issue.original_product_name}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {issue.affected_quantity}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                ${issue.original_unit_price?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                ${((issue.original_unit_price || 0) * issue.affected_quantity).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Select Resolution Type */}
        {step === 'select' && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Select Resolution Type</h4>
            <div className="space-y-2">
              {proposals.map((proposal, index) => (
                <button
                  key={index}
                  onClick={() => handleProposalSelect(proposal)}
                  className="w-full text-left p-4 border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-white">
                        {proposal.resolutionType.replace('_', ' ').toUpperCase()}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {proposal.description}
                      </p>
                      {proposal.estimatedResolutionTime && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="w-3 h-3" />
                          {proposal.estimatedResolutionTime}
                        </div>
                      )}
                    </div>
                    {proposal.requiresCustomerApproval && (
                      <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded">
                        Requires Approval
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 'details' && selectedProposal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {selectedProposal.resolutionType.replace('_', ' ').toUpperCase()} Details
              </h4>
              <button
                onClick={() => setStep('select')}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Change Resolution Type
              </button>
            </div>

            {/* Substitution Form */}
            {selectedProposal.resolutionType === 'substitution' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Substitute Product Name
                  </label>
                  <input
                    type="text"
                    value={substituteProductName}
                    onChange={(e) => setSubstituteProductName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                    placeholder="Enter substitute product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Substitute SKU
                  </label>
                  <input
                    type="text"
                    value={substituteSku}
                    onChange={(e) => setSubstituteSku(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                    placeholder="Enter substitute SKU"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Substitute Unit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={substituteUnitPrice}
                      onChange={(e) => setSubstituteUnitPrice(parseFloat(e.target.value) || 0)}
                      onBlur={handleCalculateSubstitution}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Substitute Unit Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={substituteUnitCost}
                      onChange={(e) => setSubstituteUnitCost(parseFloat(e.target.value) || 0)}
                      onBlur={handleCalculateSubstitution}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {calculation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                    <h5 className="font-medium text-blue-900 dark:text-blue-300">
                      Pricing Impact
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 dark:text-blue-400">Price Adjustment:</span>
                        <p className={`font-bold ${calculation.priceAdjustment >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculation.priceAdjustment >= 0 ? '+' : ''}${calculation.priceAdjustment.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-400">Customer Refund:</span>
                        <p className="font-bold text-green-600">
                          ${calculation.customerRefund.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-400">Invoice Adjustment:</span>
                        <p className={`font-bold ${calculation.invoiceAdjustment >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculation.invoiceAdjustment >= 0 ? '+' : ''}${calculation.invoiceAdjustment.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Refund Form */}
            {selectedProposal.resolutionType === 'refund' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Refund Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Original amount: ${((issue.original_unit_price || 0) * issue.affected_quantity).toFixed(2)}
                </p>
              </div>
            )}

            {/* Delay Form */}
            {selectedProposal.resolutionType === 'delay' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Estimated Ship Date
                </label>
                <input
                  type="date"
                  value={newEstimatedDate}
                  onChange={(e) => setNewEstimatedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white"
                placeholder="Add any additional notes about this resolution..."
              />
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        {step === 'details' && (
          <Button
            onClick={handleSubmitResolution}
            loading={loading}
            disabled={
              loading ||
              (selectedProposal?.resolutionType === 'substitution' &&
                (!substituteSku || !substituteProductName)) ||
              (selectedProposal?.resolutionType === 'delay' && !newEstimatedDate)
            }
          >
            {loading ? 'Processing...' : 'Apply Resolution'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
