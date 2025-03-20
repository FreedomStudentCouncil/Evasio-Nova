import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'

interface TermsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsDialog({ isOpen, onClose, onAccept }: TermsDialogProps) {
  const [isChecked, setIsChecked] = useState(false);

  const handleAccept = () => {
    if (isChecked) {
      onAccept();
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white mb-4"
                >
                  利用規約
                </Dialog.Title>
                <div className="mt-2">
                  <div className="text-sm text-gray-300 h-60 overflow-y-auto mb-4">
                    <h4 className="font-bold mb-2">1. 利用規約について</h4>
                    <p className="mb-4">本サービスを利用するにあたり、以下の規約に同意していただく必要があります。</p>
                    
                    <h4 className="font-bold mb-2">2. 適切な使用</h4>
                    <p className="mb-4">・不適切なコンテンツの投稿を禁止します。<br/>
                    ・他のユーザーへの嫌がらせや迷惑行為を禁止します。<br/>
                    ・著作権を侵害するコンテンツの投稿を禁止します。</p>
                    
                    <h4 className="font-bold mb-2">3. アカウント管理</h4>
                    <p className="mb-4">・アカウント情報の管理は利用者の責任で行ってください。<br/>
                    ・不正アクセスが発覚した場合は、直ちに報告してください。</p>

                    <h4 className="font-bold mb-2">3. 管理</h4>
                    <p className="mb-4">
                    ・趣旨に不適当な記事・嘘の情報は、管理者によって無許可に編集または削除されます。<br/>
                    ・管理者には全ての記事の編集・削除の権限があります。</p>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="terms-accept"
                      checked={isChecked}
                      onChange={(e) => setIsChecked(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="terms-accept" className="ml-2 text-sm text-gray-300">
                      利用規約に同意します
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none"
                    onClick={onClose}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none
                      ${isChecked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/50 cursor-not-allowed'}`}
                    onClick={handleAccept}
                    disabled={!isChecked}
                  >
                    同意して登録
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
