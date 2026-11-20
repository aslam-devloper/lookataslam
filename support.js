// support.js — Razorpay Payment & Volume 2 Bundle Checkout
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
          localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
          localStorage.setItem('lookataslam_bundle_token', 'mock_token_' + Date.now());
          alert('Success! Volume 2 bundle has been unlocked for reading.');
          if (typeof onSuccess === 'function') onSuccess({ isMock: true });
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
        image: 'https://lookataslam.com/assets/jalwa_cover.jpg',
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
              if (item === 'jalwa_v2') {
                localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
                if (verifyData.token) {
                  localStorage.setItem('lookataslam_bundle_token', verifyData.token);
                }
              }
              alert(`Thank you so much! Payment verified. ${purpose} is now unlocked.`);
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

  // Specific helper to unlock Volume 2 Bundle
  window.unlockVolume2 = function(callback) {
    window.payWithRazorpay({
      amount: 99,
      item: 'jalwa_v2',
      purpose: 'Volume 2: The World of Two (Complete Bundle)',
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
