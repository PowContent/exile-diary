import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { electronService } from '../../../electron.service';
import { useNavigate } from 'react-router-dom';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import { observer } from 'mobx-react-lite';
const { ipcRenderer } = electronService;

// Fix to allow for directory selection in inputs
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

const MainSettings = ({ settings, store, runStore }) => {
  const navigate = useNavigate();

  // Character
  const [character, setCharacter] = React.useState(
    settings.activeProfile.characterName ? settings.activeProfile.characterName : ''
  );
  const [league, setLeague] = React.useState(
    settings.activeProfile.league ? settings.activeProfile.league : ''
  );
  const handleCharacterChange = (e) => {
    e.preventDefault();
    setCharacter(e.target.value);
  };

  const handleLeagueChange = (e) => {
    e.preventDefault();
    setLeague(e.target.value);
  };

  const leagueOptions = store.characters
    .map((character: any) => character.league)
    .filter(
      (league, index) => store.characters.findIndex((char: any) => char.league === league) === index
    )
    .map((league) => (
      <MenuItem key={league} value={league}>
        {league}
      </MenuItem>
    ));

  const charactersOptions = store.characters
    .filter((character: any) => character.league === league)
    .map((character: any) => (
      <MenuItem key={character.name} value={character.name}>
        {character.name} (Level {character.level}) {character.class}{' '}
        {character.current ? '(Last Active)' : ''}
      </MenuItem>
    ));

  // Client File Location
  const [clientFileLocation, setClientFileLocation] = React.useState(settings.clientTxt);
  const handleOpenClientLocation = async (e) => {
    e.preventDefault();
    
    try {
      const result = await ipcRenderer.invoke('open-file-dialog', {
        title: 'Select Path of Exile Client.txt file',
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log('Selected file path:', filePath);
        setClientFileLocation(filePath);
      }
    } catch (error) {
      console.error('Error opening file dialog:', error);
    }
  };

  // Screenshot Folder Location
  const [screenshotLocation, setScreenshotLocation] = React.useState(settings.screenshotDir);
  const handleOpenScreenshotLocation = async (e) => {
    e.preventDefault();
    try {
      const result = await ipcRenderer.invoke('open-file-dialog', {
        title: 'Select Screenshot Folder',
        properties: ['openDirectory']
      });
      if (result && !result.canceled && result.filePaths.length > 0) {
        setScreenshotLocation(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Error opening directory dialog:', error);
    }
  };

  // League Override
  const [leagueOverride, setLeagueOverride] = React.useState(
    settings.activeProfile.leagueOverride ? settings.activeProfile.leagueOverride : ''
  );

  // Auto-screenshot delay
  const [autoScreenshotDelay, setAutoScreenshotDelay] = React.useState(
    settings.autoScreenshotOnMapEntry?.delay || 2
  );

  // Shortcut configurations
  const [runParseShortcut, setRunParseShortcut] = React.useState(
    settings.runParseShortcut || 'CommandOrControl+F10'
  );
  const [screenshotShortcut, setScreenshotShortcut] = React.useState(
    settings.screenshotShortcut || 'CommandOrControl+F8'
  );
  const [overlayToggleShortcut, setOverlayToggleShortcut] = React.useState(
    settings.overlayToggleShortcut || 'CommandOrControl+F7'
  );
  const [overlayMovementShortcut, setOverlayMovementShortcut] = React.useState(
    settings.overlayMovementShortcut || 'CommandOrControl+F9'
  );

  const [isRecordingShortcut, setIsRecordingShortcut] = React.useState(false);
  const [activeShortcutField, setActiveShortcutField] = React.useState<string | null>(null);

  const formatKeyStroke = (event: KeyboardEvent) => {
    const modifiers: string[] = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');

    let key = event.key;

    // Handle special keys
    const keyMap: { [key: string]: string } = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Return',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Tab': 'Tab',
      'Insert': 'Insert',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
    };

    if (keyMap[key]) {
      key = keyMap[key];
    } else if (key.startsWith('F') && /^F[0-9]+$/.test(key)) {
      // F1, F2, etc. - keep as is
    } else if (key.length === 1) {
      key = key.toUpperCase();
    } else if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
      return null; // Don't capture modifier keys alone
    }

    // Require at least one modifier for most keys (except function keys and special keys)
    if (modifiers.length === 0 && !key.startsWith('F') && !keyMap[event.key]) {
      return null;
    }

    return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  };

  const handleShortcutKeyDown = (event: React.KeyboardEvent) => {
    if (!isRecordingShortcut || !activeShortcutField) return;

    event.preventDefault();
    event.stopPropagation();

    // Handle Escape key to cancel recording
    if (event.key === 'Escape') {
      setIsRecordingShortcut(false);
      setActiveShortcutField(null);
      return;
    }

    const formatted = formatKeyStroke(event.nativeEvent);
    if (formatted) {
      switch (activeShortcutField) {
        case 'runParse':
          setRunParseShortcut(formatted);
          break;
        case 'screenshot':
          setScreenshotShortcut(formatted);
          break;
        case 'overlayToggle':
          setOverlayToggleShortcut(formatted);
          break;
        case 'overlayMovement':
          setOverlayMovementShortcut(formatted);
          break;
      }
      setIsRecordingShortcut(false);
      setActiveShortcutField(null);
    }
  };

  const handleShortcutClick = (fieldName: string) => {
    setIsRecordingShortcut(true);
    setActiveShortcutField(fieldName);
  };

  const handleShortcutBlur = () => {
    setIsRecordingShortcut(false);
    setActiveShortcutField(null);
  };

  const getShortcutValue = (fieldName: string) => {
    switch (fieldName) {
      case 'runParse': return runParseShortcut;
      case 'screenshot': return screenshotShortcut;
      case 'overlayToggle': return overlayToggleShortcut;
      case 'overlayMovement': return overlayMovementShortcut;
      default: return '';
    }
  };

  const setShortcutValue = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'runParse': setRunParseShortcut(value); break;
      case 'screenshot': setScreenshotShortcut(value); break;
      case 'overlayToggle': setOverlayToggleShortcut(value); break;
      case 'overlayMovement': setOverlayMovementShortcut(value); break;
    }
  };

  const ShortcutTextField = ({ fieldName, label, helperText }: {
    fieldName: string;
    label: string;
    helperText: string;
  }) => {
    const isActiveField = activeShortcutField === fieldName;
    const currentValue = getShortcutValue(fieldName);

    return (
      <TextField
        fullWidth
        label={isRecordingShortcut && isActiveField ? "Press your desired key combination..." : label}
        name={`${fieldName}_shortcut`}
        variant="filled"
        size="small"
        value={isRecordingShortcut && isActiveField ? "Recording..." : currentValue}
        onChange={(e) => !isRecordingShortcut && setShortcutValue(fieldName, e.target.value)}
        onKeyDown={handleShortcutKeyDown}
        onClick={() => handleShortcutClick(fieldName)}
        onBlur={handleShortcutBlur}
        helperText={
          isRecordingShortcut && isActiveField
            ? "Press any key combination (e.g., Ctrl+F10, Alt+R). Press Escape to cancel."
            : helperText
        }
        InputProps={{
          style: {
            backgroundColor: isRecordingShortcut && isActiveField ? '#ffebee' : undefined,
            color: isRecordingShortcut && isActiveField ? '#d32f2f' : undefined
          }
        }}
      />
    );
  };

  const handleRedirectToLogin = () => {
    navigate('/login');
  };
  const handleLogout = () => {
    ipcRenderer.invoke('oauth:logout');
  };

  const username = settings.username ? settings.username : '';
  // const league = settings.activeProfile.league ? settings.activeProfile.league : 'Unknown';
  const alternateSplinterPricing = !!settings.alternateSplinterPricing;
  const enableIncubatorAlert = !!settings.enableIncubatorAlert;
  const enableScreenshotCustomShortcut =
    settings.screenshots && !!settings.screenshots.allowCustomShortcut;
  const enableScreenshotFolderWatch =
    settings.screenshots && !!settings.screenshots.allowFolderWatch;
  const runParseScreenshotEnabled = !!settings.runParseScreenshotEnabled;
  const forceDebugMode = !!settings.forceDebugMode;

  // Overlay settings with state management
  const [overlayEnabled, setOverlayEnabled] = React.useState(!!settings.overlayEnabled);
  const [overlayPersistenceEnabled, setOverlayPersistenceEnabled] = React.useState(
    !!settings.overlayPersistenceEnabled
  );

  const handleBack = () => {
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedChar = store.characters.find((char: any) => char.name === character);
    const data = {
      activeProfile: {
        characterName: character,
        league: selectedChar ? selectedChar.league : league,
        leagueOverride: leagueOverride,
        valid: true,
      },
      clientTxt: e.target.log_location.value,
      screenshotDir: e.target.screenshot_location.value,
      alternateSplinterPricing: e.target.alternate_splinter_pricing.checked,
      overlayEnabled: overlayEnabled,
      overlayPersistenceEnabled: overlayPersistenceEnabled,
      enableIncubatorAlert: e.target.enable_incubator_alert.checked,
      runParseScreenshotEnabled: e.target.enable_run_parse_screenshot.checked,
      forceDebugMode: e.target.force_debug_mode.checked,
      screenshots: {
        allowCustomShortcut: e.target.enable_screenshot_custom_shortcut.checked,
        allowFolderWatch: e.target.enable_screenshot_folder_watch.checked,
        screenshotDir: e.target.screenshot_location.value,
      },
      autoScreenshotOnMapEntry: {
        enabled: e.target.enable_auto_screenshot_on_map_entry.checked,
        delay: autoScreenshotDelay,
      },
      runParseShortcut: runParseShortcut,
      screenshotShortcut: screenshotShortcut,
      overlayToggleShortcut: overlayToggleShortcut,
      overlayMovementShortcut: overlayMovementShortcut,
    };

    // Save settings
    await ipcRenderer.invoke('save-settings', { settings: data });

    // Update all shortcuts immediately
    await ipcRenderer.invoke('update-run-shortcut', runParseShortcut);
    await ipcRenderer.invoke('update-screenshot-shortcut', screenshotShortcut);
    await ipcRenderer.invoke('update-overlay-toggle-shortcut', overlayToggleShortcut);
    await ipcRenderer.invoke('update-overlay-movement-shortcut', overlayMovementShortcut);
  };

  const handleRefreshCharacters = () => {
    store.fetchCharacters();
  };

  const handleResetShortcuts = () => {
    setRunParseShortcut('CommandOrControl+F10');
    setScreenshotShortcut('CommandOrControl+F8');
    setOverlayToggleShortcut('CommandOrControl+F7');
    setOverlayMovementShortcut('CommandOrControl+F9');
  };

  useEffect(() => {
    store.fetchCharacters();
  }, [store]);

  // Listen for overlay persistence changes from the main process (e.g., when hotkey is pressed)
  useEffect(() => {
    const handlePersistenceChanged = (event, isEnabled) => {
      setOverlayPersistenceEnabled(isEnabled);
    };

    ipcRenderer.on('settings:overlay-persistence-changed', handlePersistenceChanged);

    return () => {
      ipcRenderer.removeListener('settings:overlay-persistence-changed', handlePersistenceChanged);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} role="tabpanel">
      <Box sx={{ p: 3 }}>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Account Name"
            id="account"
            variant="standard"
            disabled
            size="small"
            value={username}
          />
        </div>
        <ButtonGroup
          variant="outlined"
          fullWidth
          color="primary"
          aria-label="contained primary button group"
        >
          <Button onClick={handleLogout}>Logout</Button>
          <Button onClick={handleRedirectToLogin}>Refresh Login</Button>
        </ButtonGroup>
        <Divider className="Settings__Separator" />
        <div className="Settings__Row">
          {store.isLoading ? (
            <div className="Text--Normal">Loading Characters...</div>
          ) : (
            <>
              <div className="Text--Normal">Currently Active Character: </div>
              <div className="Text--Rare">
                {character ? character : 'Unknown Character'} ({league} League)
              </div>
            </>
          )}
        </div>
        <div className="Settings__Row Settings__Character-Select">
          <Select
            label="League"
            id="league"
            variant="filled"
            size="small"
            disabled={leagueOptions.length === 0}
            value={store.isLoading ? null : league}
            onChange={handleLeagueChange}
          >
            {leagueOptions}
          </Select>
          <Select
            label="Character"
            id="character"
            variant="filled"
            size="small"
            disabled={charactersOptions.length === 0}
            value={store.isLoading ? null : character}
            onChange={handleCharacterChange}
          >
            {charactersOptions}
          </Select>
          {charactersOptions.length === 0 ? (
            <FormHelperText>Disabled - No character retrieved</FormHelperText>
          ) : (
            ''
          )}
          <Button component="label" disabled={store.isLoading} onClick={handleRefreshCharacters}>
            Refresh List
          </Button>
        </div>
        <Divider className="Settings__Separator" />
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Path of Exile Client.TXT Location (usually in PoE's log folder)"
            id="log_location"
            variant="filled"
            size="small"
            value={clientFileLocation}
            onChange={(e) => setClientFileLocation(e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ marginTop: '7px', marginBottom: '10px', padding: '2px 15px' }}
            onClick={handleOpenClientLocation}
          >
            Find Path of Exile Log folder
          </Button>
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Screenshot Directory"
            id="screenshot_location"
            variant="filled"
            size="small"
            value={screenshotLocation}
            onChange={(e) => setScreenshotLocation(e.target.value)}
          />
          <Button
            component="label"
            variant="contained"
            sx={{ marginTop: '7px', marginBottom: '10px', padding: '2px 15px' }}
            onClick={handleOpenScreenshotLocation}
          >
            Find PoE Screenshot Folder
          </Button>
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="PoE.ninja league name to change league used for pricing, leave blank for character's league. (e.g. Standard, Settlers)"
            id="league_override"
            variant="filled"
            size="small"
            value={leagueOverride}
            onChange={(e) => setLeagueOverride(e.target.value)}
          />
        </div>
        <Divider className="Settings__Separator" />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox id="alternate_splinter_pricing" defaultChecked={alternateSplinterPricing} />
            }
            label="Enable Alternate Splinter Pricing"
          />
          <FormControlLabel
            control={<Checkbox id="enable_incubator_alert" defaultChecked={enableIncubatorAlert} />}
            label="Enable Incubator Running Out Alert"
          />
          <FormControlLabel
            control={
              <Checkbox
                id="enable_screenshot_folder_watch"
                defaultChecked={enableScreenshotFolderWatch}
              />
            }
            label="Enable Screenshot Folder Monitoring"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Checkbox
                  id="overlay_enabled"
                  checked={overlayEnabled}
                  onChange={(e) => setOverlayEnabled(e.target.checked)}
                />
              }
              label="Enable Overlay Popup Messages"
            />
            <Box sx={{ width: '30%' }}>
              <ShortcutTextField
                fieldName="overlayMovement"
                label="Toggle overlay movement mode"
                helperText=""
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Checkbox
                  id="overlay_persistence_enabled"
                  checked={overlayPersistenceEnabled}
                  onChange={(e) => setOverlayPersistenceEnabled(e.target.checked)}
                />
              }
              label="Enable Overlay Persistence"
            />
            <Box sx={{ width: '30%' }}>
              <ShortcutTextField
                fieldName="overlayToggle"
                label="Toggle overlay visibility"
                helperText=""
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Checkbox
                  id="enable_screenshot_custom_shortcut"
                  defaultChecked={enableScreenshotCustomShortcut}
                />
              }
              label="Enable Custom Screenshot Shortcut"
            />
            <Box sx={{ width: '30%' }}>
              <ShortcutTextField
                fieldName="screenshot"
                label="Take screenshot"
                helperText=""
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Checkbox
                  id="enable_run_parse_screenshot"
                  defaultChecked={runParseScreenshotEnabled}
                />
              }
              label="Enable shortcut to finish a run"
            />
            <Box sx={{ width: '30%' }}>
              <ShortcutTextField
                fieldName="runParse"
                label="Finish current run"
                helperText=""
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <FormControlLabel
              control={
                <Checkbox
                  id="enable_auto_screenshot_on_map_entry"
                  defaultChecked={!!settings.autoScreenshotOnMapEntry?.enabled}
                />
              }
              label="Enable auto-screenshot when entering maps"
            />
            <Box sx={{ width: '30%' }}>
              <TextField
                fullWidth
                label="Delay after entering map (0-30s)"
                id="auto_screenshot_delay"
                variant="filled"
                size="small"
                type="number"
                inputProps={{ min: 0, max: 30, step: 0.5 }}
                value={autoScreenshotDelay}
                onChange={(e) => setAutoScreenshotDelay(parseFloat(e.target.value) || 0)}
                helperText=""
              />
            </Box>
          </Box>
          <FormControlLabel
            control={<Checkbox id="force_debug_mode" defaultChecked={forceDebugMode} />}
            label="Force Debug Mode"
          />
        </Box>
        {/* TODO: Add these settings if needed */}
        {/* <Divider className="Settings__Separator" />
        <div>This section is not plugged in yet</div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel control={<Checkbox disabled />} label="Minimize to Tray" />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox disabled />}
            label="Get Item Prices even in SSF Mode"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox disabled />}
            label="Get Low-Confidence Pricing Data from poe.ninja"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel control={<Checkbox disabled />} label="Disable Gear Tracking" />
        </div> */}
        <Divider className="Settings__Separator" />
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleResetShortcuts}
            fullWidth
          >
            Reset Shortcuts to Defaults
          </Button>
        </Box>
        <ButtonGroup variant="outlined" fullWidth aria-label="Settings Control Buttons">
          <Button type="submit">Save</Button>
          <Button onClick={handleBack}>Cancel</Button>
        </ButtonGroup>
      </Box>
    </form>
  );
};

export default observer(MainSettings);
