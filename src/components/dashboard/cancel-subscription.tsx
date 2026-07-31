"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription, resumeSubscription } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Modal, SubmitRow } from "./modal";

export function CancelSubscriptionButton({ cancelAtPeriodEnd }: { cancelAtPeriodEnd: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function doCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await cancelSubscription();
    setLoading(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setOpen(false);
    toast.show("Langganan akan berhenti di akhir periode.", "info", {
      actionLabel: "Urungkan",
      onAction: async () => {
        const r = await resumeSubscription();
        if (r.error) {
          toast.show(r.error, "error");
          return;
        }
        toast.show("Dibatalkan. Langganan tetap aktif.");
        router.refresh();
      },
    });
    router.refresh();
  }

  async function doResume() {
    setLoading(true);
    const res = await resumeSubscription();
    setLoading(false);
    if (res.error) {
      toast.show(res.error, "error");
      return;
    }
    toast.show("Langganan dilanjutkan kembali.");
    router.refresh();
  }

  if (cancelAtPeriodEnd) {
    return (
      <button
        type="button"
        onClick={doResume}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? "Memproses..." : "Lanjutkan langganan"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-black/[0.08] transition-colors hover:bg-zinc-50"
      >
        Batalkan langganan
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan langganan?"
        desc="Langganan akan berhenti di akhir periode berjalan. Akses tetap aktif sampai tanggal berakhir."
      >
        <form onSubmit={doCancel}>
          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
          <SubmitRow loading={loading} onCancel={() => setOpen(false)} submitLabel="Ya, batalkan" tone="rose" />
        </form>
      </Modal>
    </>
  );
}
