import { ArrowBackRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReceiptUploadForm from '../components/ReceiptUploadForm';

const steps = [
  {
    number: '01',
    title: 'Add your receipt',
    description: 'Choose an image or PDF from your device, or take a photo.',
  },
  {
    number: '02',
    title: 'Complete the details',
    description: 'Tell us who made the purchase and what it was for.',
  },
  {
    number: '03',
    title: 'Send it for review',
    description: 'The treasury team will review your submission.',
  },
];

export default function UploadPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-svh overflow-x-clip bg-[#f6f4f0] text-[#211c19]">
      <header className="border-b border-[#211c19]/10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/necf-logo.png"
              alt="NECF logo"
              className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.02em] sm:text-base">
                Near East Christian Fellowship
              </p>
              <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#6b1c23]/70 sm:text-[0.68rem]">
                Treasury management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[#211c19]/15 bg-white/70 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[#6b1c23]/40 hover:bg-white motion-reduce:transition-none"
          >
            <ArrowBackRounded
              aria-hidden="true"
              className="transition-transform group-hover:-translate-x-1 motion-reduce:transition-none"
              fontSize="small"
            />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </button>
        </div>
      </header>

      <section className="relative isolate mx-auto grid max-w-[1440px] gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16 lg:px-12 lg:py-20">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-[0.04em] top-12 -z-10 select-none text-[clamp(12rem,34vw,34rem)] font-semibold leading-none tracking-[-0.09em] text-[#6b1c23] opacity-[0.06]"
        >
          02
        </span>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#6b1c23] sm:text-xs">
            NECF / Treasury / Receipt submission
          </p>
          <h1 className="mt-5 max-w-xl whitespace-pre-line text-[clamp(2rem,4vw,2.125rem)] font-medium leading-[1.12] tracking-[-0.025em]">
            Submit with
            {'\n'}confidence.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#514a45] sm:mt-8 sm:text-lg sm:leading-8">
            Send your receipt and purchase details to the treasury team in a few
            simple steps.
          </p>

          <ol className="mt-9 space-y-5 sm:mt-12">
            {steps.map((step) => (
              <li key={step.number} className="flex gap-4">
                <span className="pt-0.5 text-xs font-semibold tabular-nums text-[#6b1c23]/65">
                  {step.number}
                </span>
                <div>
                  <h2 className="text-sm font-semibold tracking-[-0.01em] sm:text-base">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#514a45]">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-9 border-t border-[#211c19]/10 pt-5 text-xs leading-5 text-[#514a45]/80 sm:mt-12">
            Your submission will be reviewed by the treasury team. For
            assistance, please contact the treasury department.
          </p>
        </div>

        <div className="min-w-0">
          <ReceiptUploadForm />
        </div>
      </section>

      <footer className="border-t border-[#211c19]/10 px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 text-xs text-[#514a45]/75">
          <span>Near East Christian Fellowship · Treasury management</span>
          <span>Receipt submission</span>
        </div>
      </footer>
    </main>
  );
}
