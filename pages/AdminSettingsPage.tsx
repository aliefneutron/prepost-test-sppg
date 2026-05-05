import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AdminSettingsPage: React.FC = () => {
  const [googleScriptUrl, setGoogleScriptUrl] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isPreTestActive, setIsPreTestActive] = useState(true);
  const [isPostTestActive, setIsPostTestActive] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGoogleScriptUrl(data.googleScriptUrl || '');
        setInputValue(data.googleScriptUrl || '');
        if (data.isPreTestActive !== undefined) setIsPreTestActive(data.isPreTestActive);
        if (data.isPostTestActive !== undefined) setIsPostTestActive(data.isPostTestActive);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        googleScriptUrl: inputValue,
        isPreTestActive,
        isPostTestActive
      }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Error saving settings: ", error);
      alert("Failed to save settings.");
    }
  };

  const toggleTestAccess = async (testType: 'pre' | 'post', currentValue: boolean) => {
    const newValue = !currentValue;
    if (testType === 'pre') setIsPreTestActive(newValue);
    else setIsPostTestActive(newValue);
    
    try {
      const updateData = testType === 'pre' 
        ? { isPreTestActive: newValue } 
        : { isPostTestActive: newValue };
        
      await setDoc(doc(db, 'settings', 'global'), updateData, { merge: true });
    } catch (error) {
      console.error("Error updating test access:", error);
      // Revert on error
      if (testType === 'pre') setIsPreTestActive(currentValue);
      else setIsPostTestActive(currentValue);
    }
  };

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Google Sheets Integration</h2>
          <p className="text-gray-600 mb-4">
            To automatically save test results to a Google Sheet, you need to deploy a Google Apps Script as a Web App and paste the URL below.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Apps Script Web App URL</label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isSaved ? 'Saved!' : 'Save URL'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Exam Access Control</h2>
          <p className="text-gray-600 mb-6">
            Enable or disable access to the Pre-Test and Post-Test menus globally. When disabled, participants cannot start the test.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">Pre-Test Access</h3>
                <p className="text-sm text-gray-500">Allow participants to take the Pre-Test</p>
              </div>
              <button
                onClick={() => toggleTestAccess('pre', isPreTestActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isPreTestActive ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPreTestActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">Post-Test Access</h3>
                <p className="text-sm text-gray-500">Allow participants to take the Post-Test</p>
              </div>
              <button
                onClick={() => toggleTestAccess('post', isPostTestActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isPostTestActive ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPostTestActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Setup Instructions</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-600">
            <li>Create a new <strong>Google Sheet</strong>.</li>
            <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
            <li>Delete any code in the editor and paste the code below.</li>
            <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
            <li>Select type: <strong>Web app</strong>.</li>
            <li>Description: "Test Scores".</li>
            <li>Execute as: <strong>Me</strong>.</li>
            <li>Who has access: <strong>Anyone</strong> (Important!).</li>
            <li>Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong>.</li>
            <li>Paste the URL in the field above and save.</li>
          </ol>

          <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-700">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rawData = e.postData.contents;
  var data = JSON.parse(rawData);
  
  // Create headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Name", "Score", "Test Type", "Date"]);
  }
  
  // Append the score data
  sheet.appendRow([
    data.id, 
    data.name, 
    data.score, 
    data.testType, 
    new Date(data.timestamp).toString()
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`}
            </pre>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;