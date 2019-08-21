import { Kernel, KernelMessage } from '@jupyterlab/services';

import React, { useState, useCallback, useEffect } from 'react'; 

import StyleClasses from './style';

import { Dropdown } from './Dropdown';

import { Dialog, showDialog } from '@jupyterlab/apputils';

const PackageBarStyleClasses = StyleClasses.PackageBarStyleClasses;

interface PackageSearcherProps {
  kernelId: string;
  kernelName: string;
  uninstalledPackage: string;
}

//Determine which pip message to show on button click
function getPipMessage(install: boolean, successfulProcess: boolean, packageName: string): string {
  if (!successfulProcess) { 
    let baseMsg: string = packageName + ' could not ';
    install? baseMsg += 'install.' : baseMsg += 'uninstall.';
    return baseMsg;
  }
  let baseMsg: string = '✨ ';
  install ? baseMsg += 'Installed ' : baseMsg += 'Uninstalled ';
  return baseMsg + packageName + '!';
}

//Render a component to search for a package to install
export function PackageSearcher(props: PackageSearcherProps) {
  const [input, setInput] = useState('');
  const [packageName, setPackageName] = useState('');
  const [install, setInstall] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false)
  const [stdOut, setStdOut] = useState([]);
  const [moduleErrorOccurred, setModuleErrorOccurred] = useState(false);
  const [uninstalledPackage, setUninstalledPackage] = useState('');
  //Parse stdout to determine status message
  function parseMessage(msg: KernelMessage.IStreamMsg): void {
    let msgContent = msg.content;
    if (msgContent.hasOwnProperty('text')) {
      stdOut.unshift({value: msgContent.text, label: msgContent.text});
      setStdOut(stdOut);
      if (msgContent.text.includes('Successfully') || msgContent.text.includes('already satisfied')) {
        setMessageSuccess(true);
      } else if (msgContent.text.includes('ERROR') || msgContent.text.includes('Skipping')) {
        setMessageSuccess(false);
      } 
      setShowMessage(true);
      setIsSending(false);
      setModuleErrorOccurred(false);
    }
  }
  const sendRequest = useCallback(async (input: string, install: boolean) => {
    setIsSending(true);
    setPackageName(input);
    let pipCommand: string = '';
    install ? pipCommand = '%pip install ' : pipCommand = '%pip uninstall -y ';
    Kernel.listRunning().then(kernelModels => {
      const kernel = Kernel.connectTo((kernelModels.filter(kernelModel => kernelModel.id === props.kernelId))[0]);
      kernel.requestExecute({
        code: pipCommand + input, silent: true
      }).onIOPub = msg => {parseMessage(msg as KernelMessage.IStreamMsg)}; 
    });
  }, [isSending]) 
  
  function populatePackage(uninstalledPackage: string): void {
    const packageInput: HTMLInputElement = document.getElementById('result') as HTMLInputElement;
    packageInput.value = uninstalledPackage;
  }

  // function setastate(uninstalledPackage: string) {
  //   setInput(uninstalledPackage);
  // }
  
  function installDialog() {
    let body = (
      <div>
        <p>Would you like to install <span className={PackageBarStyleClasses.uninstalledPackage}>{uninstalledPackage}</span> in this kernel?</p>
      </div>
    );
    return showDialog({
      title: 'Package Not Found',
      body,
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({
          label: 'Install',
          caption: 'Install package in this kernel'
        })
      ]
    }).then(result => {
      // setPackageName(packageName);
      // setInput(uninstalledPackage);
      // setPackageName(uninstalledPackage);
      console.log("uninstalledPackage:", uninstalledPackage);
      console.log("input:", input);
      console.log("packageName:", packageName);
      sendRequest(uninstalledPackage, true); 
      setInstall(true);
      return result.button.accept;
    });
  }
  useEffect(() => {
    setInput(uninstalledPackage)
    setPackageName(uninstalledPackage)
  }, [uninstalledPackage, input, packageName])
  return (
    <div className={PackageBarStyleClasses.packageContainer}>
      <button onClick={() => {setModuleErrorOccurred(true); setUninstalledPackage(['names', 'pandas', 'time', 'asdaasd', '123'][Math.floor((Math.random() * 5))]); installDialog(); populatePackage(uninstalledPackage);}}>
          Make error occur
      </button>
      <p className={PackageBarStyleClasses.title}>Install PyPI Packages</p>
      <p className={PackageBarStyleClasses.topBar}>Current Environment: {props.kernelName}</p>
      <div className={PackageBarStyleClasses.search}>
        <div className={PackageBarStyleClasses.heading}>
          <p className={PackageBarStyleClasses.searchTitle}>Package Name</p>
          {isSending && <p className={PackageBarStyleClasses.messageText}>Working... Please wait.</p>}
          {!isSending && showMessage && <p className={PackageBarStyleClasses.messageText}>{getPipMessage(install, messageSuccess, packageName)}</p>}
        </div>
        {/* <input id='result' className={PackageBarStyleClasses.packageInput}
              value={input}
              onChange={e => setInput(e.target.value)}
              //onClick={e => setInput((e.target as HTMLInputElement).value)}
              placeholder='Package Name'
              type='text'
              name='packageName'
              required
        /> */}
        {!moduleErrorOccurred && <input id='result' className={PackageBarStyleClasses.packageInput}
              value={input} // change to input 
              onChange={e => setInput(e.target.value)}
              //onClick={e => setInput((e.target as HTMLInputElement).value)}
              type='text'
              name='packageName'
              required
        />}
        {moduleErrorOccurred && <input id='result' className={PackageBarStyleClasses.packageInput}
              value={uninstalledPackage} // change to input 
              onChange={e => setInput(e.target.value)}
              //onClick={e => setInput((e.target as HTMLInputElement).value)}
              type='text'
              name='packageName'
              required
        />}
      </div>
      <p>Input: {input}</p>
      <p>Uninstalledpackage: {uninstalledPackage}</p>
      <p>Packagename: {packageName}</p>
      <p>17</p>
      <div className={PackageBarStyleClasses.buttonContainer}>
        <button className={PackageBarStyleClasses.pipButton}
        onClick={() => {sendRequest(input, true); setInstall(true);}}>
          Install
        </button>
        <button className={PackageBarStyleClasses.pipButton}
        onClick={() => {sendRequest(input, false); setInstall(false);}}>
          Uninstall
        </button>
      </div>
      {messageSuccess && showMessage && !isSending && <p className={PackageBarStyleClasses.kernelPrompt}>You may need to update the kernel to see updated packages.</p>}
      {showMessage && <Dropdown stdOut={stdOut}/>}
    </div>
  );
}


