import { useState, useEffect, useCallback } from "react";
import { supabase } from '../config/supabase';

export function usePayments(academicYear = "2024-2025") {
  const [payments, setPayments] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [academicYear]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: p, error: pe }, { data: f, error: fe }] =
        await Promise.all([
          supabase
            .from("payments")
            .select(
              "*, fee_types(name), students(first_name, last_name, class_id)",
            )
            .eq("academic_year", academicYear)
            .order("created_at", { ascending: false }),
          supabase.from("fee_types").select("*").order("name"),
        ]);
      if (pe) throw pe;
      if (fe) throw fe;
      setPayments(p || []);
      setFeeTypes(f || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Ajouter un paiement ───────────────────────────────────────────────────
  const addPayment = useCallback(
    async ({
      studentId,
      feeTypeId,
      amountPaid,
      amountDue,
      paymentMethod,
      notes,
    }) => {
      const status =
        amountPaid >= amountDue
          ? "paye"
          : amountPaid > 0
            ? "partiel"
            : "impaye";
      const { data, error } = await supabase
        .from("payments")
        .insert({
          student_id: studentId,
          fee_type_id: feeTypeId,
          amount_paid: amountPaid,
          amount_due: amountDue,
          payment_method: paymentMethod,
          status,
          notes,
          academic_year: academicYear,
        })
        .select("*, fee_types(name), students(first_name, last_name, class_id)")
        .single();
      if (error) throw error;
      setPayments((prev) => [data, ...prev]);
      return data;
    },
    [academicYear],
  );

  // ── Modifier un paiement ──────────────────────────────────────────────────
  const updatePayment = useCallback(async (id, updates) => {
    const status =
      updates.amount_paid >= updates.amount_due
        ? "paye"
        : updates.amount_paid > 0
          ? "partiel"
          : "impaye";
    const { data, error } = await supabase
      .from("payments")
      .update({ ...updates, status })
      .eq("id", id)
      .select("*, fee_types(name), students(first_name, last_name, class_id)")
      .single();
    if (error) throw error;
    setPayments((prev) => prev.map((p) => (p.id === id ? data : p)));
    return data;
  }, []);

  // ── Supprimer un paiement ─────────────────────────────────────────────────
  const deletePayment = useCallback(async (id) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw error;
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Ajouter un type de frais ──────────────────────────────────────────────
  const addFeeType = useCallback(
    async ({ name, amount, description, isMandatory }) => {
      const { data, error } = await supabase
        .from("fee_types")
        .insert({
          name,
          amount,
          description,
          is_mandatory: isMandatory,
          academic_year: academicYear,
        })
        .select()
        .single();
      if (error) throw error;
      setFeeTypes((prev) => [...prev, data]);
      return data;
    },
    [academicYear],
  );

  // ── Statistiques rapides ──────────────────────────────────────────────────
  const getStats = useCallback(
    (studentId = null) => {
      const filtered = studentId
        ? payments.filter((p) => p.student_id === studentId)
        : payments;
      const totalDu = filtered.reduce((s, p) => s + (p.amount_due || 0), 0);
      const totalPaye = filtered.reduce((s, p) => s + (p.amount_paid || 0), 0);
      const totalReste = totalDu - totalPaye;
      const nbPaye = filtered.filter((p) => p.status === "paye").length;
      const nbPartiel = filtered.filter((p) => p.status === "partiel").length;
      const nbImpaye = filtered.filter((p) => p.status === "impaye").length;
      return {
        totalDu,
        totalPaye,
        totalReste,
        nbPaye,
        nbPartiel,
        nbImpaye,
        total: filtered.length,
      };
    },
    [payments],
  );

  return {
    payments,
    feeTypes,
    loading,
    error,
    addPayment,
    updatePayment,
    deletePayment,
    addFeeType,
    getStats,
    refetch: fetchAll,
  };
}
