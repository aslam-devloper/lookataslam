// support.js — Razorpay Payment, Anti-Piracy Agreement, Tier Upgrades & Apple-Grade Success Modal
// Minimal, production-ready, secure integration for lookataslam author website

(function() {
  let rzpScriptLoaded = false;

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        rzpScriptLoaded = true;
        return resolve();
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        rzpScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'));
      document.body.appendChild(script);
    });
  }

  // ── Apple-Grade Success Modal with Animated Vector Tick ─────────────────────
  function showAppleSuccessModal(details = {}) {
    const {
      purpose = 'Volume 2: The World of Two',
      tier = '99 Standard',
      isUpgrade = false,
      onComplete
    } = details;

    // Remove existing if any
    const existing = document.getElementById('appleSuccessModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'appleSuccessModal';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(14, 18, 24, 0.78);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; opacity: 0; transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    overlay.innerHTML = `
      <style>
        .apple-card {
          background: var(--bg-surface, #1a222d);
          border: 1.5px solid var(--border-subtle, rgba(255,255,255,0.12));
          border-radius: 24px;
          padding: 38px 30px 32px;
          max-width: 460px; width: 100%;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45);
          transform: scale(0.92);
          transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          font-family: inherit;
        }
        .apple-tick-circle {
          width: 72px; height: 72px; margin: 0 auto 20px;
          border-radius: 50%;
          background: rgba(56, 161, 105, 0.14);
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .apple-checkmark-svg {
          width: 44px; height: 44px;
          stroke: #38a169; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;
        }
        .apple-checkmark-circle {
          stroke: #38a169; stroke-width: 2.5; stroke-dasharray: 166; stroke-dashoffset: 166;
          animation: appleStroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards 0.1s;
        }
        .apple-checkmark-check {
          stroke: #38a169; stroke-dasharray: 48; stroke-dashoffset: 48;
          animation: appleStroke 0.45s cubic-bezier(0.65, 0, 0.45, 1) forwards 0.45s;
        }
        @keyframes appleStroke { 100% { stroke-dashoffset: 0; } }
      </style>

      <div class="apple-card">
        <div class="apple-tick-circle">
          <svg class="apple-checkmark-svg" viewBox="0 0 52 52">
            <circle class="apple-checkmark-circle" cx="26" cy="26" r="23" fill="none"/>
            <path class="apple-checkmark-check" fill="none" d="M15 27l8 8 15-16"/>
          </svg>
        </div>

        <div style="font-size:0.75rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--accent); margin-bottom:8px;">
          ${isUpgrade ? 'Tier Upgraded' : 'License Verified'}
        </div>

        <h3 style="font-family:'Newsreader',Georgia,serif; font-size:1.6rem; font-weight:600; margin:0 0 12px; color:var(--text-main); line-height:1.2;">
          ${isUpgrade ? 'Supporter Edition Unlocked' : 'Thank you for supporting this story'}
        </h3>

        <p style="font-size:0.94rem; color:var(--text-muted); line-height:1.65; margin:0 0 20px;">
          ${isUpgrade 
            ? 'Your upgrade to the <strong>149 Supporter Edition</strong> is confirmed. You now hold full access to all exclusive chapters and author commentaries.' 
            : 'Every quiet morning and domestic silence between Ma’un and Naba was written for readers like you. Your personal reading license is permanently recorded.'}
        </p>

        <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px; background:var(--bg-subtle); border:1px solid var(--border-subtle); margin-bottom:24px; font-size:0.8rem; font-weight:700; color:var(--text-main);">
          <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#38a169;"></span>
          <span>${purpose} &middot; Tier: ${tier}</span>
        </div>

        <div>
          <button id="appleSuccessBtn" style="width:100%; padding:13px 20px; font-weight:700; font-size:0.95rem; border:none; background:var(--accent); color:#ffffff; border-radius:12px; cursor:pointer; box-shadow:0 4px 14px rgba(217,119,87,0.35); transition:transform 0.15s;">
            Dive into the Story &rarr;
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger spring transition
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      const card = overlay.querySelector('.apple-card');
      if (card) card.style.transform = 'scale(1)';
    });

    const closeAndProceed = () => {
      overlay.style.opacity = '0';
      const card = overlay.querySelector('.apple-card');
      if (card) card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        overlay.remove();
        if (typeof onComplete === 'function') onComplete();
        else window.location.href = 'reader.html?novel=jalwa_v2&ch=0';
      }, 300);
    };

    overlay.querySelector('#appleSuccessBtn')?.addEventListener('click', closeAndProceed);
  }

  // ── Pre-purchase Anti-Piracy Agreement Modal ────────────────────────────────
  function showLicenseAgreement(options) {
    return new Promise((resolve) => {
      const existing = document.getElementById('licenseAgreementModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'licenseAgreementModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(20,16,12,0.65);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

      const isUpgrade = Boolean(options.isUpgrade);
      const amount = options.amount || (isUpgrade ? 50 : 99);

      modal.innerHTML = `
        <div style="background:var(--bg-surface);border:2px solid var(--border);border-radius:20px;max-width:500px;width:100%;padding:30px 26px;box-shadow:4px 4px 0 var(--border);font-family:inherit;box-sizing:border-box;">
          <div style="font-size:0.75rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;">
            ${isUpgrade ? 'Supporter Tier Upgrade &middot; ₹50' : 'Digital Content Licensing Agreement'}
          </div>
          <h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.45rem;font-weight:600;margin:0 0 14px;color:var(--text-main);line-height:1.2;">
            ${isUpgrade ? 'Upgrade to Supporter Edition' : 'Digital Edition Purchase & Licensing'}
          </h3>
          
          <div style="font-size:0.92rem;line-height:1.65;color:var(--text-muted);margin-bottom:18px;">
            <p style="margin:0 0 10px;">You are purchasing a <strong>single-user, personal reading license</strong>. Every chapter delivered to your account is digitally watermarked with your transaction ID.</p>
            <p style="margin:0;">Sharing, uploading, or re-hosting this edition on Telegram, Discord, or PDF drives is strictly prohibited. Violators face immediate license revocation and formal legal action under the Copyright Act, 1957.</p>
          </div>

          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;background:var(--bg-subtle);border:1.5px solid var(--border-subtle);border-radius:10px;margin-bottom:20px;font-size:0.86rem;line-height:1.45;color:var(--text-main);">
            <input type="checkbox" id="licenseCheckbox" style="margin-top:2px;accent-color:var(--accent);width:16px;height:16px;flex-shrink:0;">
            <span>I agree to the <a href="rights.html" target="_blank" style="color:var(--accent);font-weight:700;text-decoration:underline;">Content &amp; Distribution Rights</a> and acknowledge that this purchase is forensically watermarked and tied to my payment ID.</span>
          </label>

          <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
            <button id="cancelLicenseBtn" style="padding:10px 18px;font-weight:700;font-size:0.88rem;border:1.5px solid var(--border);background:var(--bg-surface);color:var(--text-main);border-radius:var(--btn-radius,10px);cursor:pointer;">Cancel</button>
            <button id="confirmLicenseBtn" disabled style="padding:10px 22px;font-weight:700;font-size:0.88rem;border:1.5px solid var(--border);background:var(--border-subtle);color:var(--text-muted);border-radius:var(--btn-radius,10px);cursor:not-allowed;box-shadow:none;transition:all 0.15s;">
              Proceed (₹${amount}) &rarr;
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const checkbox = modal.querySelector('#licenseCheckbox');
      const confirmBtn = modal.querySelector('#confirmLicenseBtn');
      const cancelBtn = modal.querySelector('#cancelLicenseBtn');

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          confirmBtn.disabled = false;
          confirmBtn.style.background = 'var(--accent)';
          confirmBtn.style.color = '#fff';
          confirmBtn.style.borderColor = 'var(--accent)';
          confirmBtn.style.cursor = 'pointer';
          confirmBtn.style.boxShadow = '2px 2px 0 var(--border)';
        } else {
          confirmBtn.disabled = true;
          confirmBtn.style.background = 'var(--border-subtle)';
          confirmBtn.style.color = 'var(--text-muted)';
          confirmBtn.style.borderColor = 'var(--border)';
          confirmBtn.style.cursor = 'not-allowed';
          confirmBtn.style.boxShadow = 'none';
        }
      });

      confirmBtn.addEventListener('click', () => {
        if (checkbox.checked) {
          modal.remove();
          resolve(true);
        }
      });

      cancelBtn.addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      });
    });
  }

  // ── Global Helper: Initiate Razorpay Checkout ──────────────────────────────
  window.payWithRazorpay = async function(options = {}) {
    const {
      amount = 99,
      item = 'jalwa_v2',
      purpose = 'Just a Little While Apart — Volume 2 Bundle',
      isUpgrade = false,
      previousPaymentId = '',
      onSuccess,
      onClose
    } = options;

    try {
      if (item !== 'tip') {
        const agreed = await showLicenseAgreement(options);
        if (!agreed) {
          if (typeof onClose === 'function') onClose();
          return;
        }
      }

      await loadRazorpayScript();

      // 1. Create order on server
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, purpose, item, isUpgrade, previousPaymentId })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment.');
      }

      // If in mock/dev mode
      if (orderData.isMock) {
        const confirmMock = confirm(
          `[Development Preview]\nRazorpay test keys are not yet configured in Vercel environment variables.\n\nSimulate successful payment for ₹${amount} (${purpose})?`
        );
        if (confirmMock) {
          const mockPaymentId = 'pay_mock_' + Date.now();
          const targetTier = (amount >= 149 || isUpgrade) ? '149 Supporter' : '99 Standard';

          localStorage.setItem('lookataslam_unlocked_' + item, 'true');
          localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
          localStorage.setItem('lookataslam_bundle_token_' + item, 'mock_token_' + Date.now());
          localStorage.setItem('lookataslam_bundle_token', 'mock_token_' + Date.now());
          localStorage.setItem('lookataslam_payment_id', mockPaymentId);
          localStorage.setItem('lookataslam_payment_id_' + item, mockPaymentId);
          localStorage.setItem('lookataslam_tier_' + item, targetTier);

          showAppleSuccessModal({
            purpose,
            tier: targetTier,
            isUpgrade,
            onComplete: () => {
              if (typeof onSuccess === 'function') onSuccess({ isMock: true, paymentId: mockPaymentId, tier: targetTier });
              else window.location.reload();
            }
          });
        }
        return;
      }

      // 2. Open Razorpay Checkout modal
      const rzpOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'lookataslam',
        description: purpose,
        image: 'https://lookataslam.vercel.app/assets/cover_revised.png',
        order_id: orderData.orderId,
        handler: async function(response) {
          try {
            // 3. Cryptographically verify signature on server
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                item,
                amount,
                isUpgrade,
                previousPaymentId
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.verified) {
              const paymentId = response.razorpay_payment_id || verifyData.paymentId;
              const targetTier = verifyData.tier || (amount >= 149 || isUpgrade ? '149 Supporter' : '99 Standard');

              localStorage.setItem('lookataslam_unlocked_' + item, 'true');
              localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
              localStorage.setItem('lookataslam_tier_' + item, targetTier);

              if (verifyData.token) {
                localStorage.setItem('lookataslam_bundle_token_' + item, verifyData.token);
                localStorage.setItem('lookataslam_bundle_token', verifyData.token);
              }
              if (paymentId) {
                localStorage.setItem('lookataslam_payment_id', paymentId);
                localStorage.setItem('lookataslam_payment_id_' + item, paymentId);
              }

              // Apple-style tactile celebration & gratitude modal
              showAppleSuccessModal({
                purpose,
                tier: targetTier,
                isUpgrade,
                onComplete: () => {
                  if (typeof onSuccess === 'function') onSuccess(verifyData);
                  else window.location.reload();
                }
              });
            } else {
              alert(verifyData.error || 'Payment verification could not be completed.');
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment succeeded with bank, but server verification failed. Please contact indedevaslam@outlook.com');
          }
        },
        theme: {
          color: '#d97757'
        },
        modal: {
          ondismiss: function() {
            if (typeof onClose === 'function') onClose();
          }
        }
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on('payment.failed', function(resp) {
        alert(resp.error?.description || 'Payment was cancelled or failed.');
      });
      rzp.open();
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.message || 'Unable to open payment modal. Please try again.');
    }
  };

  // Helper to unlock Volume 2 Standard (₹99)
  window.unlockVolume2 = function(callback) {
    window.payWithRazorpay({
      amount: 99,
      item: 'jalwa_v2',
      purpose: 'Volume 2: The World of Two (Standard Edition)',
      onSuccess: callback
    });
  };

  // Helper to unlock Volume 2 Supporter Edition (₹149)
  window.unlockVolume2Supporter = function(callback) {
    window.payWithRazorpay({
      amount: 149,
      item: 'jalwa_v2',
      purpose: 'Volume 2: The World of Two (Supporter Edition)',
      onSuccess: callback
    });
  };

  // Helper to Upgrade from Standard to Supporter for ₹50
  window.upgradeToSupporter = function(itemKey = 'jalwa_v2', callback) {
    const prevPid = localStorage.getItem('lookataslam_payment_id_' + itemKey) || localStorage.getItem('lookataslam_payment_id') || '';
    window.payWithRazorpay({
      amount: 50,
      item: itemKey,
      purpose: 'Supporter Tier Upgrade (₹50)',
      isUpgrade: true,
      previousPaymentId: prevPid,
      onSuccess: callback
    });
  };

  // Helper for reader support / tip
  window.openDonation = function() { window.open('https://razorpay.me/@mohammadibraheem', '_blank'); };
  window.tipAuthor = function(amount = 49) {
    window.payWithRazorpay({
      amount,
      item: 'tip',
      purpose: 'Reader Support for lookataslam'
    });
  };
})();
