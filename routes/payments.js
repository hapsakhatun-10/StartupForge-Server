const express = require("express");
const router = express.Router();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = function (paymentCollection) {
    // POST /payment/create-checkout — create Stripe checkout session
    router.post("/create-checkout", async (req, res) => {
        try {
            const { user_email } = req.body;

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                customer_email: user_email,
                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: "StartupForge Premium — Unlimited Opportunities",
                                description: "Post unlimited opportunities for your startup.",
                            },
                            unit_amount: 999, // $9.99
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${req.headers.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/dashboard/founder/premium`,
            });

            res.json({ url: session.url });
        } catch (error) {
            res.status(500).json({ message: "Stripe error", error: error.message });
        }
    });

    // GET /payment/success — verify payment and save transaction
    router.get("/success", async (req, res) => {
        try {
            const { session_id } = req.query;
            if (!session_id) {
                return res.status(400).json({ message: "Missing session_id" });
            }

            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status === "paid") {
                const payment = {
                    user_email: session.customer_details?.email || "unknown",
                    amount: session.amount_total / 100,
                    transaction_id: session.payment_intent,
                    payment_status: "completed",
                    paid_at: new Date(),
                };

                await paymentCollection.insertOne(payment);

                return res.json({
                    message: "Payment successful",
                    transaction_id: session.payment_intent,
                });
            }

            res.status(400).json({ message: "Payment not completed" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /payment/check/:email — check if user has active premium
    router.get("/check/:email", async (req, res) => {
        try {
            const payment = await paymentCollection.findOne(
                { user_email: req.params.email, payment_status: "completed" },
                { sort: { paid_at: -1 } }
            );
            if (payment) return res.json({ isPremium: true, transaction_id: payment.transaction_id, paid_at: payment.paid_at });
            res.json({ isPremium: false });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /payment/transactions — list all transactions (admin)
    router.get("/transactions", async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;
            const total = await paymentCollection.countDocuments({});
            const data = await paymentCollection.find({}).sort({ paid_at: -1 }).skip(skip).limit(limit).toArray();
            res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
