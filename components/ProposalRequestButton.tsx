"use client";

interface Props {
  token: string;
  product: {
    id: string;
    product_name: string;
    category: string;
  };
}

export default function ProposalRequestButton({ token, product }: Props) {
  function handleRequest() {
    // Fire-and-forget tracking
    fetch("/api/proposals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        event_type: "request_click",
        product_id: product.id,
      }),
    }).catch(() => {});

    // Redirect to sourcing page pre-filled
    const params = new URLSearchParams({
      product: product.product_name,
      ref: `proposal-${token}`,
      category: product.category,
    });
    window.location.href = `/en/sourcing?${params.toString()}`;
  }

  return (
    <button
      type="button"
      onClick={handleRequest}
      className="w-full mt-5 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-lg transition"
    >
      Request this product →
    </button>
  );
}
