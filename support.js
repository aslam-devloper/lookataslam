// support.js — Razorpay Payment, Anti-Piracy Agreement & Volume Bundle Checkout
// Minimal, secure client-side integration for lookataslam author website

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

  // Pre-purchase Anti-Piracy Agreement Modal
  function showLicenseAgreement(options) {
    return new Promise((resolve) => {
      // Remove any existing modal
      const existing = document.getElementById('licenseAgreementModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'licenseAgreementModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(20,16,12,0.65);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

      modal.innerHTML = `
        <div style="background:var(--bg-surface);border:2px solid var(--border);border-radius:18px;max-width:500px;width:100%;padding:28px 24px;box-shadow:4px 4px 0 var(--border);font-family:inherit;box-sizing:border-box;">
          <div style="font-size:0.75rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;">Legal Confirmation &middot; Anti-Piracy</div>
          <h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.45rem;font-weight:600;margin:0 0 14px;color:var(--text-main);line-height:1.2;">Digital Content Licensing Agreement</h3>
          
          <div style="font-size:0.92rem;line-height:1.65;color:var(--text-muted);margin-bottom:18px;">
            <p style="margin:0 0 10px;">You are purchasing a <strong>single-user, personal reading license</strong>. Every chapter delivered to your account is digitally watermarked with your transaction ID.</p>
            <p style="margin:0;">Leaking, uploading, or sharing this edition (including on Telegram, Discord, or PDF drives) is strictly prohibited under the Copyright Act, 1957. Violators face immediate license revocation and formal legal action.</p>
          </div>

          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;background:var(--bg-subtle);border:1.5px solid var(--border-subtle);border-radius:10px;margin-bottom:20px;font-size:0.86rem;line-height:1.45;color:var(--text-main);">
            <input type="checkbox" id="licenseCheckbox" style="margin-top:2px;accent-color:var(--accent);width:16px;height:16px;flex-shrink:0;">
            <span>I agree to the <a href="rights.html" target="_blank" style="color:var(--accent);font-weight:700;text-decoration:underline;">Content &amp; Distribution Rights</a> and acknowledge that this purchase is forensically watermarked and traceable to my payment ID.</span>
          </label>

          <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
            <button id="cancelLicenseBtn" style="padding:10px 18px;font-weight:700;font-size:0.88rem;border:1.5px solid var(--border);background:var(--bg-surface);color:var(--text-main);border-radius:var(--btn-radius,10px);cursor:pointer;">Cancel</button>
            <button id="confirmLicenseBtn" disabled style="padding:10px 22px;font-weight:700;font-size:0.88rem;border:1.5px solid var(--border);background:var(--border-subtle);color:var(--text-muted);border-radius:var(--btn-radius,10px);cursor:not-allowed;box-shadow:none;transition:all 0.15s;">Proceed to Checkout &rarr;</button>
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

  // Global helper: initiate checkout
  window.payWithRazorpay = async function(options = {}) {
    const {
      amount = 99,
      item = 'jalwa_v2',
      purpose = 'Just a Little While Apart — Volume 2 Bundle',
      onSuccess,
      onClose
    } = options;

    try {
      // Require Anti-Piracy Agreement for all paid editions
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
        body: JSON.stringify({ amount, purpose, item })
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
          localStorage.setItem('lookataslam_unlocked_' + item, 'true');
          localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
          localStorage.setItem('lookataslam_bundle_token_' + item, 'mock_token_' + Date.now());
          localStorage.setItem('lookataslam_bundle_token', 'mock_token_' + Date.now());
          localStorage.setItem('lookataslam_payment_id', mockPaymentId);
          localStorage.setItem('lookataslam_payment_id_' + item, mockPaymentId);
          alert('Success! Content unlocked. Forensic tracking identifier registered.');
          if (typeof onSuccess === 'function') onSuccess({ isMock: true, paymentId: mockPaymentId });
          else window.location.reload();
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
            // 3. Verify payment signature on server
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                item,
                amount
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.verified) {
              const paymentId = response.razorpay_payment_id || verifyData.paymentId;
              
              // Persist unlock state and tracking credentials for this and future books
              localStorage.setItem('lookataslam_unlocked_' + item, 'true');
              localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
              if (verifyData.token) {
                localStorage.setItem('lookataslam_bundle_token_' + item, verifyData.token);
                localStorage.setItem('lookataslam_bundle_token', verifyData.token);
              }
              if (paymentId) {
                localStorage.setItem('lookataslam_payment_id', paymentId);
                localStorage.setItem('lookataslam_payment_id_' + item, paymentId);
              }

              alert(`Payment verified! ${purpose} is now unlocked. Thank you for supporting independent fiction.`);
              if (typeof onSuccess === 'function') onSuccess(verifyData);
              else window.location.reload();
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

  // Helper to unlock Volume 2 Bundle
  window.unlockVolume2 = function(callback) {
    window.payWithRazorpay({
      amount: 99,
      item: 'jalwa_v2',
      purpose: 'Volume 2: The World of Two (Complete Bundle)',
      onSuccess: callback
    });
  };

  // Helper for future book volumes (Vol 3, Vol 4, Vol 5, etc.)
  window.unlockBookVolume = function(itemKey, title, amount = 99, callback) {
    window.payWithRazorpay({
      amount,
      item: itemKey,
      purpose: title,
      onSuccess: callback
    });
  };

  // Reader tip / support helper
  window.openDonation = function() { window.open('https://razorpay.me/@mohammadibraheem', '_blank'); };
  window.tipAuthor = function(amount = 49) {
    window.payWithRazorpay({
      amount,
      item: 'tip',
      purpose: 'Reader Support for lookataslam'
    });
  };
})();
