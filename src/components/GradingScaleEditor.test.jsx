// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GradingScaleEditor from './GradingScaleEditor';

afterEach(cleanup);

const setup = () => {
  const updateSchoolInfo = vi.fn();
  render(<GradingScaleEditor schoolInfo={{}} updateSchoolInfo={updateSchoolInfo} />);
  return updateSchoolInfo;
};
const save = () => screen.getByRole('button', { name: /Enregistrer le barème/ });

describe('GradingScaleEditor', () => {
  it('affiche le barème par défaut et ne propose rien à enregistrer tant que rien n\'a changé', () => {
    setup();
    expect(screen.getByLabelText('Seuil Excellent').value).toBe('18');
    expect(screen.getByLabelText("Seuil d'admission").value).toBe('12');
    expect(save().disabled).toBe(true);
  });

  it('enregistre un barème modifié et cohérent', () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText("Seuil d'admission"), { target: { value: '10' } });
    expect(save().disabled).toBe(false);
    fireEvent.click(save());
    expect(update).toHaveBeenCalledWith('gradingScale', { cutoffs: [18, 16, 14, 12, 10], difficulty: 8, admission: 10 });
  });

  it('refuse un barème incohérent avec un message, sans rien enregistrer', () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText('Seuil Bien'), { target: { value: '17' } });
    expect(screen.getByRole('alert').textContent).toMatch(/décroissants/);
    expect(save().disabled).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('accepte la virgule décimale', () => {
    const update = setup();
    fireEvent.change(screen.getByLabelText('Seuil Passable'), { target: { value: '9,5' } });
    fireEvent.click(save());
    expect(update.mock.calls[0][1].cutoffs[4]).toBe(9.5);
  });

  it('rétablit le barème par défaut', () => {
    const update = setup();
    fireEvent.click(screen.getByRole('button', { name: /Rétablir/ }));
    expect(update).toHaveBeenCalledWith('gradingScale', null);
  });
});
