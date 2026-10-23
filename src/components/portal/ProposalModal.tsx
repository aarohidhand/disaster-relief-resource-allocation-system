import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import type { SupplyItem } from '../../algorithms/types';
import { Modal } from '../ui/Modal';
import { MAX_UNITS_PER_PROPOSAL, SECTOR_LABELS, SECTOR_ORDER, formatDecimal, formatLakh, proposalRef } from '../../lib/format';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supply: SupplyItem) => void;
  supplyToEdit: SupplyItem | null;
  knownZones: string[];
}

const DEFAULT_ZONES = [
  'Jaipur Relief Camp',
  'Hospital Emergency Zone',
  'Rural High-Altitude Camp',
  'Flood-Affected Sector 4',
  'Village Relief Centre',
  'Mobile Medical Camp B',
];

type Errors = Partial<Record<'name' | 'unitWeight' | 'unitBenefit' | 'quantity' | 'destination', string>>;

export function ProposalModal({ isOpen, onClose, onSave, supplyToEdit, knownZones }: ProposalModalProps) {
  const uid = useId();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplyItem['category']>('Food & Water');
  const [destination, setDestination] = useState('');
  const [unitWeight, setUnitWeight] = useState('');
  const [unitBenefit, setUnitBenefit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (supplyToEdit) {
      setName(supplyToEdit.name);
      setCategory(supplyToEdit.category);
      setDestination(supplyToEdit.destination);
      setUnitWeight(String(supplyToEdit.unitWeight));
      setUnitBenefit(String(supplyToEdit.unitBenefit));
      setQuantity(String(supplyToEdit.quantity));
    } else {
      setName('');
      setCategory('Food & Water');
      setDestination(DEFAULT_ZONES[0]);
      setUnitWeight('15');
      setUnitBenefit('90');
      setQuantity('5');
    }
    setErrors({});
  }, [supplyToEdit, isOpen]);

  const zones = Array.from(new Set([...DEFAULT_ZONES, ...knownZones]));
  const w = Number(unitWeight);
  const v = Number(unitBenefit);
  const q = Number(quantity);
  const previewOk = Number.isFinite(w) && w > 0 && Number.isFinite(v) && v >= 0 && Number.isFinite(q) && q > 0;

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter the proposal or resource name.';
    if (!unitWeight.trim() || !Number.isInteger(w) || w < 1) next.unitWeight = 'Enter a whole number of ₹ lakh, 1 or more.';
    if (!unitBenefit.trim() || !Number.isInteger(v) || v < 0) next.unitBenefit = 'Enter a whole-number impact score, 0 or more.';
    if (!quantity.trim() || !Number.isInteger(q) || q < 1 || q > MAX_UNITS_PER_PROPOSAL)
      next.quantity = `Enter a whole number of units from 1 to ${MAX_UNITS_PER_PROPOSAL}.`;
    if (!destination.trim()) next.destination = 'Enter the implementing zone.';
    return next;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({
      id: supplyToEdit ? supplyToEdit.id : `sup-${Date.now()}`,
      name: name.trim(),
      unitWeight: w,
      unitBenefit: v,
      quantity: q,
      destination: destination.trim(),
      category,
    });
    onClose();
  };

  const errorCount = Object.keys(errors).length;
  const fieldCls = (key: keyof Errors) => `input ${errors[key] ? 'border-gov-danger focus:border-gov-danger focus:ring-red-200' : ''}`;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={supplyToEdit ? `Edit proposal ${proposalRef(supplyToEdit.id)}` : 'New proposal'}
      description="Costs are in whole ₹ lakh per unit. The plan is recalculated as soon as you save."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={`${uid}-form`} className="btn-primary">
            {supplyToEdit ? 'Save changes' : 'Add proposal'}
          </button>
        </>
      }
    >
      <form id={`${uid}-form`} onSubmit={handleSubmit} noValidate className="space-y-5">
        {errorCount > 0 && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gov-danger" aria-hidden="true" />
            <p>
              {errorCount === 1 ? 'One field needs attention.' : `${errorCount} fields need attention.`} Check the highlighted entries
              below.
            </p>
          </div>
        )}

        <div>
          <label htmlFor={`${uid}-name`} className="field-label">
            Proposal / resource name
          </label>
          <input
            id={`${uid}-name`}
            data-autofocus
            className={fieldCls('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mobile Water Treatment Unit"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          />
          {errors.name && (
            <p id={`${uid}-name-err`} className="mt-1 text-[13px] text-gov-danger">
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-sector`} className="field-label">
              Sector
            </label>
            <select
              id={`${uid}-sector`}
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyItem['category'])}
            >
              {SECTOR_ORDER.map((c) => (
                <option key={c} value={c}>
                  {SECTOR_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-zone`} className="field-label">
              Implementing zone
            </label>
            <input
              id={`${uid}-zone`}
              list={`${uid}-zones`}
              className={fieldCls('destination')}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              aria-invalid={!!errors.destination}
              aria-describedby={errors.destination ? `${uid}-zone-err` : undefined}
            />
            <datalist id={`${uid}-zones`}>
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            {errors.destination && (
              <p id={`${uid}-zone-err`} className="mt-1 text-[13px] text-gov-danger">
                {errors.destination}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-cost`} className="field-label">
              Unit cost (₹ lakh)
            </label>
            <input
              id={`${uid}-cost`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className={`${fieldCls('unitWeight')} figure`}
              value={unitWeight}
              onChange={(e) => setUnitWeight(e.target.value)}
              aria-invalid={!!errors.unitWeight}
              aria-describedby={`${uid}-cost-hint`}
            />
            <p id={`${uid}-cost-hint`} className={errors.unitWeight ? 'mt-1 text-[13px] text-gov-danger' : 'field-hint'}>
              {errors.unitWeight ?? 'Cost of one unit'}
            </p>
          </div>
          <div>
            <label htmlFor={`${uid}-impact`} className="field-label">
              Impact per unit
            </label>
            <input
              id={`${uid}-impact`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className={`${fieldCls('unitBenefit')} figure`}
              value={unitBenefit}
              onChange={(e) => setUnitBenefit(e.target.value)}
              aria-invalid={!!errors.unitBenefit}
              aria-describedby={`${uid}-impact-hint`}
            />
            <p id={`${uid}-impact-hint`} className={errors.unitBenefit ? 'mt-1 text-[13px] text-gov-danger' : 'field-hint'}>
              {errors.unitBenefit ?? 'Projected social impact score'}
            </p>
          </div>
          <div>
            <label htmlFor={`${uid}-qty`} className="field-label">
              Units requested
            </label>
            <input
              id={`${uid}-qty`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_UNITS_PER_PROPOSAL}
              step={1}
              className={`${fieldCls('quantity')} figure`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-invalid={!!errors.quantity}
              aria-describedby={`${uid}-qty-hint`}
            />
            <p id={`${uid}-qty-hint`} className={errors.quantity ? 'mt-1 text-[13px] text-gov-danger' : 'field-hint'}>
              {errors.quantity ?? 'Each unit is funded or deferred'}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-gov-line bg-gov-line text-sm">
          <div className="bg-gov-canvas px-3 py-2.5">
            <dt className="text-xs text-gov-sub">Total requested</dt>
            <dd className="figure mt-0.5 font-semibold text-gov-ink">{previewOk ? `₹${formatLakh(w * q)} L` : '—'}</dd>
          </div>
          <div className="bg-gov-canvas px-3 py-2.5">
            <dt className="text-xs text-gov-sub">Impact per ₹ lakh</dt>
            <dd className="figure mt-0.5 font-semibold text-gov-ink">{previewOk ? formatDecimal(v / w) : '—'}</dd>
          </div>
        </dl>
      </form>
    </Modal>
  );
}
